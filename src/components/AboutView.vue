<script setup lang="ts">
import { ref, computed, onUnmounted } from 'vue'
import { Download, ExternalLink, Globe, Heart, RotateCw } from '@lucide/vue'
import brand from '../assets/keyboard.svg'
import donation from '../assets/donate.png'
import { translate } from '../i18n'
import type { Language } from '../core/preferences'
import { projectUrl, websiteUrl, storeUrl, visit } from '../runtime'
import { isNewerVersion } from '../core/session'
const props = defineProps<{ language: Language; store: boolean }>()
const version = __APP_VERSION__
const t = (key: Parameters<typeof translate>[1]) => translate(props.language, key)
const revealed = ref(false)
const author = computed(() => revealed.value ? 'ChenHe' : 'Smileher')
const state = ref<'updateIdle'|'checking'|'latest'|'available'|'updateFailed'|'firstRelease'>('updateIdle')
const newVersion = ref('')
const linkError = ref(false)
let revealTimer: ReturnType<typeof setTimeout> | undefined
let controller: AbortController | undefined
function reveal() { clearTimeout(revealTimer); revealed.value = !revealed.value; if (revealed.value) revealTimer = setTimeout(() => revealed.value = false, 5000) }
async function open(url: string) { linkError.value = false; try { await visit(url) } catch { linkError.value = true } }
async function check() {
  if (state.value === 'checking') return
  state.value = 'checking'
  controller = new AbortController()
  const timeout = setTimeout(() => controller?.abort(), 12000)
  try {
    const response = await fetch(`https://api.github.com/repos/${projectUrl.split('github.com/')[1]}/releases/latest`, { signal: controller.signal, headers: { Accept: 'application/vnd.github+json' } })
    if (response.status === 404) { state.value = 'firstRelease'; return }
    if (!response.ok) throw new Error(`HTTP ${response.status}`)
    const release = await response.json()
    if (typeof release.tag_name !== 'string' || !/^v?\d+\.\d+\.\d+$/.test(release.tag_name)) throw new Error('Invalid release version')
    newVersion.value = release.tag_name.replace(/^v/, '')
    state.value = isNewerVersion(newVersion.value, version) ? 'available' : 'latest'
  } catch { if (!controller.signal.aborted || state.value === 'checking') state.value = 'updateFailed' } finally { clearTimeout(timeout) }
}
onUnmounted(() => { clearTimeout(revealTimer); controller?.abort() })
</script>
<template>
  <section class="about-page"><div class="about-product"><img :src="brand" alt="" /><div><h1>{{ t('appName') }}</h1><p>{{ t('tagline') }}</p></div><span class="version-badge">{{ version }}</span></div>
    <div class="panel update-panel"><div class="update-summary"><RotateCw :size="20" :class="{ spinning: state === 'checking' }" /><div><span>{{ t('update') }}</span><strong>{{ store ? t('storeManaged') : t(state) }}<template v-if="!store && state === 'available'"> · {{ newVersion }}</template></strong></div></div><div class="update-actions"><button v-if="store" type="button" class="button primary-button" @click="open(storeUrl)">{{ t('store') }}<ExternalLink :size="14" /></button><template v-else><button type="button" class="button" :disabled="state === 'checking'" @click="check"><RotateCw :size="14" />{{ t(state === 'checking' ? 'checking' : 'check') }}</button><button type="button" class="button" @click="open(`${projectUrl}/releases/latest`)"><Download :size="14" />{{ t('download') }}</button></template></div></div>
    <div class="panel support-panel"><div class="support-copy"><Heart :size="22" /><div><h2>{{ t('support') }}</h2><p>{{ t('supportHint') }}</p><span>{{ t('author') }} <button class="author-button" type="button" :aria-label="t('authorName')" :aria-pressed="revealed" @click="reveal"><Transition name="author"><span :key="author">{{ author }}</span></Transition></button></span></div></div><div class="donation-code"><img :src="donation" :alt="t('donation')" /><img class="donation-brand" :src="brand" alt="" /></div></div>
    <footer class="about-footer"><div><button type="button" class="link-button" @click="open(`${websiteUrl}?lang=${language}`)"><Globe :size="15" />{{ t('website') }}<ExternalLink :size="12" /></button><button type="button" class="link-button" @click="open(projectUrl)">{{ t('project') }}<ExternalLink :size="12" /></button></div><p>© 2026 <button class="author-button" type="button" :aria-label="t('authorName')" :aria-pressed="revealed" @click="reveal"><Transition name="author"><span :key="author">{{ author }}</span></Transition></button></p><p v-if="linkError" role="alert" class="error-text">{{ t('openFailed') }}</p></footer>
  </section>
</template>
