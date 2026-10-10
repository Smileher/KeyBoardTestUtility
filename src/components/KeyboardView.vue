<script setup lang="ts">
import { computed } from 'vue'
import { Keyboard, Monitor, Command, RotateCcw } from '@lucide/vue'
import { keyboardLayout, detectableKeys, type PlatformLayout } from '../core/layouts'
import type { Session } from '../core/session'
import { translate } from '../i18n'
import type { Language } from '../core/preferences'
import KeyCap from './KeyCap.vue'
const props = defineProps<{ platform: PlatformLayout; session: Session; language: Language; locks: { caps: boolean; num: boolean; scroll: boolean }; preview?: boolean }>()
const emit = defineEmits<{ 'update:platform': [value: PlatformLayout]; reset: [] }>()
const layout = computed(() => keyboardLayout(props.platform))
const keys = computed(() => detectableKeys(layout.value))
const tested = computed(() => keys.value.filter(key => props.session.tested.has(key.code)).length)
const percentage = computed(() => Math.round(tested.value / keys.value.length * 100))
const t = (key: Parameters<typeof translate>[1]) => translate(props.language, key)
</script>
<template>
  <section class="keyboard-panel panel" :aria-label="t('keyboard')">
    <header class="keyboard-header">
      <div class="keyboard-summary"><span class="panel-icon"><Keyboard :size="21" /></span><div><div class="summary-line"><strong>{{ t('keyboard') }}</strong><span class="count-badge">{{ tested }} / {{ keys.length }}</span></div><div class="progress-line"><div class="progress" role="progressbar" :aria-label="t('count')" :aria-valuenow="tested" :aria-valuemax="keys.length" :aria-valuemin="0"><span :style="{ width: `${percentage}%` }" /></div><span>{{ percentage }}%</span></div></div></div>
      <div v-if="!preview" class="keyboard-tools"><div class="lock-indicators"><span :class="{ on: locks.num }">Num</span><span :class="{ on: locks.caps }">Caps</span><span :class="{ on: locks.scroll }">Scroll</span></div><div class="segmented platform-switch" :aria-label="t('keyboard')"><button type="button" :aria-pressed="platform === 'win'" @click="emit('update:platform', 'win')"><Monitor :size="15" />Win</button><button type="button" :aria-pressed="platform === 'mac'" @click="emit('update:platform', 'mac')"><Command :size="15" />Mac</button></div><button type="button" class="icon-button" :aria-label="t('reset')" :title="t('reset')" @click="emit('reset')"><RotateCcw :size="18" /></button></div>
    </header>
    <div class="keyboard-scroll"><div class="keyboard-layout" :class="platform"><div class="keyboard-main"><div v-for="(row, index) in layout.main" :key="index" class="key-row"><KeyCap v-for="(key, i) in row" :key="key.code || `gap-${i}`" :definition="key" :platform="platform" :pressed="session.pressed.has(key.code)" :tested="session.tested.has(key.code)" :hint="t('nonDetectable')" /></div></div><div class="keyboard-navigation"><div v-for="(row, index) in layout.navigation" :key="index" class="key-row"><KeyCap v-for="(key, i) in row" :key="key.code || `gap-${i}`" :definition="key" :platform="platform" :pressed="session.pressed.has(key.code)" :tested="session.tested.has(key.code)" :hint="t('nonDetectable')" /></div></div><div class="keyboard-numpad"><KeyCap v-for="key in layout.numpad" :key="key.code" :definition="key" :platform="platform" :pressed="session.pressed.has(key.code)" :tested="session.tested.has(key.code)" :hint="t('nonDetectable')" /></div></div></div>
    <footer class="keyboard-footer"><div class="legend"><span><i class="swatch" />{{ t('untested') }}</span><span><i class="swatch tested" />{{ t('tested') }}</span><span><i class="swatch pressed" />{{ t('pressed') }}</span></div><span>{{ [...session.pressed.keys()].filter(code => !code.startsWith('Mouse')).length }} {{ t('held') }}</span></footer>
  </section>
</template>
