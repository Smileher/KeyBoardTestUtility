<script setup lang="ts">
import { Mouse } from '@lucide/vue'
import type { Session } from '../core/session'
import type { Language } from '../core/preferences'
import { translate } from '../i18n'
const props = defineProps<{ session: Session; language: Language }>()
const t = (key: Parameters<typeof translate>[1]) => translate(props.language, key)
</script>
<template>
  <section class="panel mouse-panel" :aria-label="t('mouse')"><header class="section-header"><h2><Mouse :size="16" />{{ t('mouse') }}</h2></header>
    <div class="mouse-buttons"><div v-for="(code, i) in ['Mouse0','Mouse1','Mouse2']" :key="code" class="mouse-key" :class="{ tested: session.tested.has(code), pressed: session.pressed.has(code) }"><span>{{ t((['left','middle','right'] as const)[i]!) }}</span><span class="mouse-key-state">{{ session.pressed.has(code) ? t('down') : session.tested.has(code) ? t('up') : '—' }}</span></div></div>
  </section>
</template>
