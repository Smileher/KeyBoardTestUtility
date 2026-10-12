<script setup lang="ts">
import { computed, nextTick, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import { Keyboard, SlidersHorizontal, Info, Download, ExternalLink, Sun, Moon } from '@lucide/vue'
import KeyboardView from './components/KeyboardView.vue'
import MouseView from './components/MouseView.vue'
import RecordView from './components/RecordView.vue'
import SettingsView from './components/SettingsView.vue'
import AboutView from './components/AboutView.vue'
import DiagnosticsView from './components/DiagnosticsView.vue'
import TypingView from './components/TypingView.vue'
import brand from './assets/keyboard.svg'
import { createSession, acceptInput, releaseInputs, resetSession, normalizeBrowserCode, type InputEvent } from './core/session'
import { loadPreferences, savePreferences, type Accent, type Language, type Theme } from './core/preferences'
import { keyboardLayout, detectableKeys } from './core/layouts'
import { createDiagnostics, interruptDiagnostics, observeInput, browserDispatchDelay, testModes, type TestMode } from './core/diagnostics'
import { translate } from './i18n'
import { desktop, desktopFocus, nativeInputs, runtimeInfo, setCapture, setWindowTheme, visit, projectUrl } from './runtime'
import { installBrowserPolicy, isEditable } from './browser-policy'

const preferences = reactive(loadPreferences())
const sessions = reactive(Object.fromEntries(testModes.map(mode => [mode, createSession()])) as Record<TestMode, ReturnType<typeof createSession>>)
const diagnostics = reactive(Object.fromEntries(testModes.map(mode => [mode, createDiagnostics()])) as Record<TestMode, ReturnType<typeof createDiagnostics>>)
const mode = ref<TestMode>('keys')
const session = computed(() => sessions[mode.value])
const diagnostic = computed(() => diagnostics[mode.value])
const editing = ref(false)
const recordsOpen = ref(false)
const view = ref<'home'|'test'|'settings'|'about'>(desktop || window.location.hash === '#test' ? 'test' : 'home')
const platform = computed({ get: () => preferences.platform, set: value => { preferences.platform = value; persist() } })
const region = computed({ get: () => preferences.layout, set: value => { preferences.layout = value; persist() } })
const focused = ref(document.hasFocus())
const native = ref(false)
const store = ref(false)
const nativeError = ref(false)
const saveError = ref(false)
const lostFocus = ref(false)
const systemDark = ref(window.matchMedia('(prefers-color-scheme: dark)').matches)
const currentTheme = computed(() => preferences.theme === 'system' ? (systemDark.value ? 'dark' : 'light') : preferences.theme)
const active = computed(() => view.value === 'test' && focused.value && !document.hidden)
const keyboardMode = computed(() => !['typing', 'mouse'].includes(mode.value))
const labels = computed(() => {
  const result = new Map(detectableKeys(keyboardLayout(platform.value, region.value)).map(key => [key.code, key.label || t('space')]))
  const mouseLabels = ['mouseLeft', 'mouseMiddle', 'mouseRight', 'mouseBack', 'mouseForward'] as const
  mouseLabels.forEach((key, index) => result.set(`Mouse${index}`, t(key)))
  return result
})
const latest = computed(() => session.value.records[0])
const locks = reactive({ num: false, caps: false, scroll: false })
const t = (key: Parameters<typeof translate>[1]) => translate(preferences.language, key)
const version = __APP_VERSION__
let unlisten: (() => void) | undefined
let unlistenFocus: (() => void) | undefined
let removePolicy: (() => void) | undefined
let disposed = false
let captureQueue: Promise<void> = Promise.resolve()
let appearanceQueue: Promise<void> = Promise.resolve()
let windowThemeQueue: Promise<void> = Promise.resolve()
const media = window.matchMedia('(prefers-color-scheme: dark)')
let modeEnteredAt = Date.now()
let dropStarted = 0
let diagnosticTimer: ReturnType<typeof setInterval> | undefined

// 同步主题偏好而非解析后的配色，保留原生窗口跟随系统的能力。
watch(() => preferences.theme, theme => {
  windowThemeQueue = windowThemeQueue.then(() => {
    if (!disposed) return setWindowTheme(theme)
  }).catch(error => { console.warn('Failed to synchronize window theme', error) })
}, { immediate: true, flush: 'sync' })

watch([currentTheme, () => preferences.accent, () => preferences.language], () => {
  document.documentElement.dataset.theme = currentTheme.value
  document.documentElement.dataset.accent = preferences.accent
  document.documentElement.lang = preferences.language
  document.title = t('appName')
}, { immediate: true, flush: 'sync' })

function receive(input: InputEvent) {
  // 原生事件已通过前台 HWND 校验，不再依赖 WebView 与顶层窗口不同步的焦点事件。
  if (view.value !== 'test' || document.hidden || (!native.value && !focused.value) || input.at < modeEnteredAt) return
  if (input.source === 'native' && !native.value) return
  if (input.code.startsWith('Mouse') ? mode.value !== 'mouse' : (!keyboardMode.value || editing.value)) return
  lostFocus.value = false
  if (native.value && input.down && !session.value.pressed.has(input.code)) {
    if (input.code === 'CapsLock') locks.caps = !locks.caps
    if (input.code === 'NumLock') locks.num = !locks.num
    if (input.code === 'ScrollLock') locks.scroll = !locks.scroll
  }
  if (acceptInput(session.value, input)) observeInput(diagnostic.value, mode.value, input, session.value)
}
function queueCapture() {
  const enabled = view.value === 'test' && !document.hidden && native.value && keyboardMode.value && !editing.value
  captureQueue = captureQueue.then(() => setCapture(enabled)).catch(() => { nativeError.value = true; native.value = false })
}
function releaseCurrent() { releaseInputs(session.value); interruptDiagnostics(diagnostic.value) }
watch(active, enabled => { if (!enabled) releaseCurrent(); queueCapture() })
watch(view, () => { releaseCurrent(); queueCapture() })
watch(mode, (_, previous) => {
  releaseInputs(sessions[previous]); interruptDiagnostics(diagnostics[previous])
  recordsOpen.value = false
  modeEnteredAt = Date.now()
  // 重置原生钩子的重复状态；串行执行避免快速切换时倒序启用。
  captureQueue = captureQueue.then(() => setCapture(false)).catch(() => { nativeError.value = true; native.value = false })
  queueCapture()
})
watch(editing, () => { releaseCurrent(); queueCapture() })
watch([platform, region], () => { resetCurrent(); modeEnteredAt = Date.now() })
function resetCurrent() { resetSession(session.value); diagnostics[mode.value] = createDiagnostics(); queueCapture() }
function editableFocus(event: FocusEvent) {
  if (event.type === 'focusin') editing.value = isEditable(event.target)
  else editing.value = isEditable(event.relatedTarget)
}
function toggleDrop() {
  if (diagnostic.value.running) { diagnostic.value.running = false; diagnostic.value.released.clear(); return }
  resetCurrent()
  dropStarted = performance.now()
  diagnostic.value.running = true
}
function selectCombo() {
  releaseInputs(session.value)
  if (diagnostic.value.recordingCombo) diagnostic.value.recordingCombo = false
  else { diagnostic.value.combo = []; diagnostic.value.comboPassed = false; diagnostic.value.recordingCombo = true }
}

function keyboard(event: KeyboardEvent) {
  if (!active.value || !keyboardMode.value || editing.value || isEditable(event.target)) return
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
    releaseCurrent()
    queueCapture()
  }
  const code = normalizeBrowserCode(event.code, event.key, event.location)
  const now = performance.now()
  receive({ code: code && code !== 'Unidentified' ? code : `Key ${event.key} · ${event.keyCode}`, raw: `${event.code || event.key} · ${event.keyCode}`, down: event.type === 'keydown', repeat: event.repeat, at: Date.now(), monotonic: now, source: 'browser', dispatchDelayMs: browserDispatchDelay(event.timeStamp, now, performance.timeOrigin) })
}
function mouse(event: MouseEvent) {
  if (view.value !== 'test' || mode.value !== 'mouse' || document.hidden) return
  const code = `Mouse${event.button}`
  // 工具按钮不参与测试；从测试区域按住后移到工具按钮松开，仍需解除按住状态。
  if (event.type === 'mousedown') {
    if (event.target instanceof Element && event.target.closest('button, a, input, select, textarea, [role="button"], [role="switch"]')) return
    if (!(event.target instanceof Element) || !event.target.closest('[data-mouse-test]')) return
    // 收到窗口内鼠标输入即表明当前可交互，避免顶层窗口与 WebView 焦点不同步漏记。
    if (!focused.value) focus()
  } else if (!session.value.pressed.has(code)) return
  receive({ code: `Mouse${event.button}`, down: event.type === 'mousedown', at: Date.now(), monotonic: performance.now() })
}
function focus() {
  focused.value = true
  queueCapture()
  if (native.value) void runtimeInfo().then(info => { if (!disposed && focused.value && info.locks) Object.assign(locks, info.locks) }).catch(() => {})
}
function blur() {
  if (session.value.pressed.size) lostFocus.value = true
  focused.value = false
  releaseCurrent()
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
  document.addEventListener('focusin', editableFocus)
  document.addEventListener('focusout', editableFocus)
  diagnosticTimer = setInterval(() => { if (diagnostics.drop.running) diagnostics.drop.elapsed = performance.now() - dropStarted }, 100)
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
  if (diagnosticTimer) clearInterval(diagnosticTimer)
  document.removeEventListener('focusin', editableFocus)
  document.removeEventListener('focusout', editableFocus)
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
      <div class="brand"><button v-if="!desktop" type="button" class="brand-home" :aria-label="t('appName')" @click="view = 'home'"><img :src="brand" alt="" /></button><template v-else><img :src="brand" alt="" /><strong>{{ t('appName') }}</strong></template></div>
      <nav class="test-tabs" :aria-label="t('test')"><button v-for="item in testModes" :key="item" type="button" :class="{ selected: view === 'test' && mode === item }" :aria-current="view === 'test' && mode === item ? 'page' : undefined" @click="mode = item; view = 'test'">{{ t(item) }}</button></nav>
      <div class="header-tools"><button v-for="item in ['settings', 'about'] as const" :key="item" type="button" class="icon-button" :class="{ selected: view === item }" :aria-label="t(item)" :title="t(item)" @click="view = item"><component :is="item === 'settings' ? SlidersHorizontal : Info" :size="17" /></button></div>
      <div class="theme-control" :aria-label="t('appearance')">
        <button type="button" role="switch" class="theme-toggle" :class="{ dark: currentTheme === 'dark' }" :aria-checked="currentTheme === 'dark'" :aria-label="t('dark')" :title="t(currentTheme === 'dark' ? 'light' : 'dark')" @click="appearance('theme', currentTheme === 'dark' ? 'light' : 'dark', $event)"><Sun class="theme-sun" :size="18" aria-hidden="true" /><Moon class="theme-moon" :size="17" aria-hidden="true" /><span class="theme-thumb" /></button>
      </div>
    </header>
    <main class="content" :class="{ 'test-content': view === 'test' }">
      <template v-if="view === 'test'">
        <header class="test-heading"><div><h1>{{ t(mode) }}</h1><p>{{ t(`${mode}Description`) }}</p></div><details v-if="['chatter', 'rollover', 'drop', 'latency'].includes(mode)" class="measurement-help"><summary>{{ t('learn') }}</summary><p>{{ t(`${mode}Help` as 'chatterHelp' | 'rolloverHelp' | 'dropHelp' | 'latencyHelp') }}</p></details></header>
        <DiagnosticsView v-if="['chatter', 'rollover', 'drop', 'latency'].includes(mode)" :mode="mode" :state="diagnostic" :language="preferences.language" :labels="labels" :native="native" @toggle="toggleDrop" @combo="selectCombo" @reset="resetCurrent" @threshold="value => { diagnostic.threshold = value; diagnostic.released.clear() }" />
        <KeyboardView v-if="keyboardMode && mode !== 'latency'" v-model:platform="platform" v-model:region="region" :session="session" :language="preferences.language" :locks="locks" @reset="resetCurrent" />
        <TypingView v-else-if="mode === 'typing'" :language="preferences.language" :active="active" />
        <MouseView v-else-if="mode === 'mouse'" :session="session" :language="preferences.language" @reset="resetCurrent" />
        <div v-if="mode !== 'typing'" class="input-summary"><span>{{ t('latestInput') }} <strong>{{ latest ? labels.get(latest.code) || latest.code : '—' }}</strong><span v-if="latest"> · {{ t(latest.action) }}<template v-if="latest.duration !== undefined"> · {{ latest.duration.toFixed(1) }} ms</template></span></span><button type="button" class="quiet-button" :aria-expanded="recordsOpen" @click="recordsOpen = !recordsOpen">{{ t('records') }} · {{ session.records.length }} {{ recordsOpen ? '▴' : '▾' }}</button></div>
        <RecordView v-if="recordsOpen && mode !== 'typing'" :session="session" :platform="platform" :region="region" :language="preferences.language" @clear="session.records.length = 0" />
        <p v-if="keyboardMode && (!native || platform === 'mac')" class="capture-hint">{{ t(platform === 'mac' ? 'macHint' : 'webHint') }}</p>
        <footer class="test-footer"><span class="capture-status"><i :class="{ active }" />{{ t(!active ? 'paused' : native && keyboardMode ? 'nativeMode' : 'webMode') }}</span><button v-if="!desktop" type="button" class="link-button" @click="downloads"><Download :size="13" />{{ t('desktopDownloads') }}<ExternalLink :size="11" /></button><span v-if="nativeError" role="status">{{ t('unavailable') }}</span><span v-else-if="lostFocus" role="status">{{ t('lostFocus') }}</span></footer>
      </template>
      <section v-else-if="view === 'home'" class="home-page">
        <div class="home-intro"><span class="home-eyebrow">KeyBoardTestUtility · 3.0</span><h1>{{ t('tagline') }}</h1><p>{{ t('homeDescription') }}</p><div class="home-actions"><button type="button" class="button primary-button" @click="view = 'test'"><Keyboard :size="17" />{{ t('onlineTest') }}</button><button type="button" class="button" @click="downloads"><Download :size="17" />{{ t('desktopDownloads') }}</button></div><span class="home-platforms">Windows · macOS · Web</span></div>
        <KeyboardView class="home-preview" :platform="platform" :region="region" :session="session" :language="preferences.language" :locks="locks" preview />
      </section>
      <SettingsView v-else-if="view === 'settings'" :preferences="preferences" :save-error="saveError" @accent="(value, event) => appearance('accent', value, event)" @language="language" @theme="(value, event) => appearance('theme', value, event)" />
      <AboutView v-else :language="preferences.language" :store="store" />
    </main>
  </div>
</template>
