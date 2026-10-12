<script setup lang="ts">
import { Mouse, RotateCcw } from '@lucide/vue'
import type { Session } from '../core/session'
import type { Language } from '../core/preferences'
import { translate } from '../i18n'
const props = defineProps<{ session: Session; language: Language }>()
const emit = defineEmits<{ reset: [] }>()
const t = (key: Parameters<typeof translate>[1]) => translate(props.language, key)
</script>
<template>
  <section class="panel mouse-panel" data-mouse-test :aria-label="t('mouse')"><header class="section-header"><h2><Mouse :size="16" />{{ t('mouse') }}</h2><button type="button" class="icon-button" :aria-label="t('reset')" @click="emit('reset')"><RotateCcw :size="17" /></button></header>
    <div class="mouse-buttons"><div v-for="(code, i) in ['Mouse0','Mouse1','Mouse2','Mouse3','Mouse4']" :key="code" class="mouse-key" :class="{ tested: session.tested.has(code), pressed: session.pressed.has(code) }"><span>{{ t((['left','middle','right','back','forward'] as const)[i]!) }}</span><span class="mouse-key-state">{{ session.pressed.has(code) ? t('down') : session.tested.has(code) ? t('up') : '—' }}</span></div></div>
    <Mouse class="mouse-illustration" :size="96" :stroke-width="1" aria-hidden="true" /><p class="panel-hint">{{ t('mouseHint') }}</p>
  </section>
</template>
