<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { Keyboard, SlidersHorizontal, Info, Download, ExternalLink, Sun, Moon } from '@lucide/vue'
import KeyboardView from './components/KeyboardView.vue'
import MouseView from './components/MouseView.vue'
import RecordView from './components/RecordView.vue'
import SettingsView from './components/SettingsView.vue'
import AboutView from './components/AboutView.vue'
import brand from './assets/keyboard.svg'
import { createSession, acceptInput, releaseInputs, resetSession, normalizeBrowserCode, type InputEvent } from './core/session'
import { loadPreferences, savePreferences, type Accent, type Language, type Theme } from './core/preferences'
import type { PlatformLayout } from './core/layouts'
import { translate } from './i18n'
import { desktop, desktopFocus, nativeInputs, runtimeInfo, setCapture, visit, projectUrl } from './runtime'
import { installBrowserPolicy } from './browser-policy'

const preferences = reactive(loadPreferences())
const session = reactive(createSession())
const view = ref<'home'|'test'|'settings'|'about'>(desktop || window.location.hash === '#test' ? 'test' : 'home')
const platform = ref<PlatformLayout>(navigator.platform.startsWith('Mac') ? 'mac' : 'win')
const focused = ref(document.hasFocus())
const native = ref(false)
const store = ref(false)
const nativeError = ref(false)
const saveError = ref(false)
const lostFocus = ref(false)
const systemDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)
const currentTheme = computed(() => preferences.theme === 'system' ? (systemDark.value ? 'dark' : 'light') : preferences.theme)
const active = computed(() => view.value === 'test' && focused.value && !document.hidden)
const locks = reactive({ num: false, caps: false, scroll: false })
const t = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key)
const version = __APP_VERSION__
let unlisten: (() => void) | undefined
let unlistenFocus: (() => void) | undefined
let removePolicy: (() => void) | undefined
let disposed = false
let captureQueue: Promise<void> = Promise.resolve()
let appearanceQueue: Promise<void> = Promise.resolve()
const media = window.matchMedia('(prefers-color-scheme: dark)')

watch([currentTheme, () => preferences.accent, () => preferences.language], () => {
  document.documentElement.dataset.theme = currentTheme.value
  document.documentElement.dataset.accent = preferences.accent
  document.documentElement.lang = preferences.language
  document.title = t('appName')
}, { immediate: true, flush: 'sync' })

function receive(input: InputEvent) {
  // 原生事件已通过前台 HWND 校验，不再依赖 WebView 与顶层窗口不同步的焦点事件。
  if (view.value !== 'test' || document.hidden || (!native.value && !focused.value)) return
  lostFocus.value = false
  if (native.value && input.down && !session.pressed.has(input.code)) {
    if (input.code === 'CapsLock') locks.caps = !locks.caps
    if (input.code === 'NumLock') locks.num = !locks.num
    if (input.code === 'ScrollLock') locks.scroll = !locks.scroll
  }
  acceptInput(session, input)
}
function queueCapture() {
  const enabled = view.value === 'test' && !document.hidden && native.value
  captureQueue = captureQueue.then(() => setCapture(enabled)).catch(() => { nativeError.value = true; native.value = false })
}
watch(active, enabled => { if (!enabled) releaseInputs(session); queueCapture() })
watch(view, queueCapture)

function keyboard(event: KeyboardEvent) {
  if (!active.value) return
  // preventDefault 不阻止记录；Esc、Tab 和空格在测试页都只作为被测按键。
  event.preventDefault()
  locks.caps = event.getModifierState('CapsLock')
  locks.num = event.getModifierState('NumLock')
  locks.scroll = event.getModifierState('ScrollLock')
  if (native.value) {
    // 正常原生捕获会吞掉普通键；只有 Alt 和锁定键会继续送到 DOM。
    // 普通键仍进入 DOM 表明钩子未拦截，立即转入窗口输入，避免显示可用却没有反馈。
    if (['AltLeft', 'AltRight', 'CapsLock', 'NumLock', 'ScrollLock'].includes(event.code)) return
    native.value = false
    nativeError.value = true
    releaseInputs(session)
    queueCapture()
  }
  const code = normalizeBrowserCode(event.code, event.key, event.location)
  receive({ code: code && code !== 'Unidentified' ? code : `Key ${event.key} · ${event.keyCode}`, raw: `${event.code || event.key} · ${event.keyCode}`, down: event.type === 'keydown', repeat: event.repeat, at: Date.now(), monotonic: performance.now() })
}
function mouse(event: MouseEvent) {
  if (view.value !== 'test' || document.hidden) return
  const code = `Mouse${event.button}`
  // 工具按钮不参与测试；从测试区域按住后移到工具按钮松开，仍需解除按住状态。
  if (event.type === 'mousedown') {
    if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea, [role="button"], [role="switch"]')) return
    // 收到窗口内鼠标输入即表明当前可交互，避免顶层窗口与 WebView 焦点不同步漏记。
    if (!focused.value) focus()
  } else if (!session.pressed.has(code)) return
  receive({ code: `Mouse${event.button}`, down: event.type === 'mousedown', at: Date.now(), monotonic: performance.now() })
}
function focus() {
  focused.value = true
  queueCapture()
  if (native.value) void runtimeInfo().then(info => { if (!disposed && focused.value && info.locks) Object.assign(locks, info.locks) }).catch(() => {})
}
function blur() {
  if (session.pressed.size) lostFocus.value = true
  focused.value = false
  releaseInputs(session)
}
function visibility() { if (document.hidden) blur(); else if (!desktop && document.hasFocus()) focus(); queueCapture() }
function persist() { saveError.value = !savePreferences(preferences) }
function language(value: Language) { preferences.language = value; persist() }

// 不支持快照或要求减少动态效果时直接应用；失败时也只执行一次设置操作。
async function animateAppearance(kind: 'theme'|'accent', origin: { x: number; y: number }, operation: () => void) {
  if (!document.startViewTransition || window.matchMedia('(prefers-reduced-motion: reduce)').matches) { operation(); return }
  let applied = false
  const apply = async () => { if (!applied) { applied = true; operation() }; await nextTick() }
  document.documentElement.classList.add('appearance-changing')
  try {
    const transition = document.startViewTransition(apply)
    try {
      await transition.ready
      const radius = Math.hypot(Math.max(origin.x, window.innerWidth - origin.x), Math.max(origin.y, window.innerHeight - origin.y))
      const frames = kind === 'theme' ? { clipPath: [`circle(0px at ${origin.x}px ${origin.y}px)`, `circle(${radius}px at ${origin.x}px ${origin.y}px)`] } : { opacity: [0, 1] }
      await document.documentElement.animate(frames, { duration: kind === 'theme' ? 900 : 480, easing: 'cubic-bezier(.4, 0, .2, 1)', pseudoElement: '::view-transition-new(root)' }).finished
    } catch { /* 快照不可用时保持已应用的设置。 */ }
    await transition.finished.catch(() => {})
  } catch { await apply() } finally { document.documentElement.classList.remove('appearance-changing') }
}
function appearance(kind: 'theme'|'accent', value: Theme | Accent, event: MouseEvent) {
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  const origin = { x: rect.left + rect.width / 2, y: rect.top + rect.height / 2 }
  appearanceQueue = appearanceQueue.then(async () => {
    if (preferences[kind] === value || disposed) return
    await animateAppearance(kind, origin, () => {
      if (kind === 'theme') preferences.theme = value as Theme
      else preferences.accent = value as Accent
      persist()
    })
  })
}
function systemTheme(event: MediaQueryListEvent) {
  appearanceQueue = appearanceQueue.then(async () => {
    if (disposed) return
    if (preferences.theme !== 'system') { systemDark.value = event.matches; return }
    systemDark.value = event.matches
  })
}
async function downloads() { try { await visit(`${projectUrl}/releases/latest`) } catch { view.value = 'about' } }

onMounted(async () => {
  removePolicy = installBrowserPolicy()
  window.addEventListener('keydown', keyboard)
  window.addEventListener('keyup', keyboard)
  window.addEventListener('mousedown', mouse, true)
  window.addEventListener('mouseup', mouse, true)
  if (!desktop) {
    window.addEventListener('focus', focus)
    window.addEventListener('blur', blur)
  }
  document.addEventListener('visibilitychange', visibility)
  media.addEventListener('change', systemTheme)
  try {
    if (desktop) {
      unlisten = await nativeInputs(receive)
      unlistenFocus = await desktopFocus(value => value ? focus() : blur())
    }
    const info = await runtimeInfo()
    if (disposed) { unlisten?.(); unlistenFocus?.(); return }
    native.value = info.nativeKeyboard
    store.value = info.store
    if (info.locks) Object.assign(locks, info.locks)
    if (desktop && !info.nativeKeyboard && navigator.platform.startsWith('Win')) nativeError.value = true
    queueCapture()
  } catch { nativeError.value = true }
})
onUnmounted(() => {
  disposed = true
  void setCapture(false)
  unlisten?.()
  unlistenFocus?.()
  removePolicy?.()
  window.removeEventListener('keydown', keyboard)
  window.removeEventListener('keyup', keyboard)
  window.removeEventListener('mousedown', mouse, true)
  window.removeEventListener('mouseup', mouse, true)
  window.removeEventListener('focus', focus)
  window.removeEventListener('blur', blur)
  document.removeEventListener('visibilitychange', visibility)
  media.removeEventListener('change', systemTheme)
})
</script>

<template>
  <div class="app-shell">
    <header class="app-header">
      <div class="brand"><img :src="brand" alt="" /><button v-if="!desktop" type="button" class="brand-home" @click="view = 'home'">{{ t('appName') }}</button><strong v-else>{{ t('appName') }}</strong></div>
      <nav :aria-label="t('test')"><button v-for="item in ['test','settings','about'] as const" :key="item" type="button" :class="{ selected: view === item }" :aria-current="view === item ? 'page' : undefined" @click="view = item"><component :is="item === 'test' ? Keyboard : item === 'settings' ? SlidersHorizontal : Info" :size="15" /><span>{{ t(item) }}</span></button></nav>
      <div class="theme-control" :aria-label="t('appearance')">
        <button type="button" role="switch" class="theme-toggle" :class="{ dark: currentTheme === 'dark' }" :aria-checked="currentTheme === 'dark'" :aria-label="t('dark')" :title="t(currentTheme === 'dark' ? 'light' : 'dark')" @click="appearance('theme', currentTheme === 'dark' ? 'light' : 'dark', $event)"><Sun class="theme-sun" :size="18" aria-hidden="true" /><Moon class="theme-moon" :size="17" aria-hidden="true" /><span class="theme-thumb" /></button>
      </div>
    </header>
    <main class="content" :class="{ 'test-content': view === 'test' }">
      <template v-if="view === 'test'">
        <KeyboardView v-model:platform="platform" :session="session" :language="preferences.language" :locks="locks" @reset="resetSession(session)" />
        <div class="lower-grid"><MouseView :session="session" :language="preferences.language" /><RecordView :session="session" :platform="platform" :language="preferences.language" @clear="session.records.length = 0" /></div>
        <footer class="test-footer"><span class="capture-status"><i :class="{ active }" />{{ t(!active ? 'paused' : native ? 'nativeMode' : 'webMode') }}</span><button v-if="!desktop" type="button" class="link-button" @click="downloads"><Download :size="13" />{{ t('desktopDownloads') }}<ExternalLink :size="11" /></button><span v-if="nativeError" role="status">{{ t('unavailable') }}</span><span v-else-if="lostFocus" role="status">{{ t('lostFocus') }}</span></footer>
      </template>
      <section v-else-if="view === 'home'" class="home-page">
        <div class="home-intro"><span class="home-eyebrow">KeyBoardTestUtility · 2.0</span><h1>{{ t('tagline') }}</h1><p>{{ t('homeDescription') }}</p><div class="home-actions"><button type="button" class="button primary-button" @click="view = 'test'"><Keyboard :size="17" />{{ t('onlineTest') }}</button><button type="button" class="button" @click="downloads"><Download :size="17" />{{ t('desktopDownloads') }}</button></div><span class="home-platforms">Windows · macOS · Web</span></div>
        <KeyboardView class="home-preview" :platform="platform" :session="session" :language="preferences.language" :locks="locks" preview />
      </section>
      <SettingsView v-else-if="view === 'settings'" :preferences="preferences" :save-error="saveError" @accent="(value, event) => appearance('accent', value, event)" @language="language" />
      <AboutView v-else :language="preferences.language" :store="store" />
    </main>
  </div>
</template>
