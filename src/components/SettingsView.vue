<script setup lang="ts">
import { Check } from '@lucide/vue'
import { accents, languages, languageNames, type Preferences, type Accent, type Language, type Theme } from '../core/preferences'
import { translate } from '../i18n'
const props = defineProps<{ preferences: Preferences; saveError: boolean }>()
const emit = defineEmits<{ accent: [value: Accent, event: MouseEvent]; language: [value: Language]; theme: [value: Theme, event: MouseEvent] }>()
const t = (key: Parameters<typeof translate>[1]) => translate(props.preferences.language, key)
</script>
<template>
  <section class="preferences-page"><h1>{{ t('settings') }}</h1><div class="panel settings-panel">
    <div class="setting-card"><div><strong>{{ t('appearance') }}</strong><p>{{ t('appearanceHint') }}</p></div><div class="segmented"><button v-for="theme in ['system', 'light', 'dark'] as const" :key="theme" type="button" :aria-pressed="preferences.theme === theme" @click="emit('theme', theme, $event)">{{ t(theme) }}</button></div></div>
    <div class="setting-card"><div><strong>{{ t('accent') }}</strong><p>{{ t('accentHint') }}</p></div><div class="color-options"><button v-for="color in accents" :key="color" type="button" :class="['color-swatch', `color-${color}`]" :aria-label="t(color)" :title="t(color)" :aria-pressed="preferences.accent === color" @click="emit('accent', color, $event)"><Check v-if="preferences.accent === color" :size="14" /></button></div></div>
    <div class="setting-card"><div><strong>{{ t('language') }}</strong><p>{{ t('languageHint') }}</p></div><div class="segmented language-options"><button v-for="id in languages" :key="id" type="button" :lang="id" :aria-pressed="preferences.language === id" @click="emit('language', id)">{{ languageNames[id] }}</button></div></div>
  </div><p v-if="saveError" role="status" class="error-text">{{ t('saveFailed') }}</p></section>
</template>
