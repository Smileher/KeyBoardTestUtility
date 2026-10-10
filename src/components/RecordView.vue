<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted } from 'vue'
import { List, Trash2 } from '@lucide/vue'
import type { Session } from '../core/session'
import { keyboardLayout, detectableKeys, type PlatformLayout } from '../core/layouts'
import type { Language } from '../core/preferences'
import { translate } from '../i18n'
const props = defineProps<{ session: Session; platform: PlatformLayout; language: Language }>()
const emit = defineEmits<{ clear: [] }>()
const container = ref<HTMLElement>()
const visibleRows = ref(4)
let resize: ResizeObserver | undefined
onMounted(() => {
  resize = new ResizeObserver(([entry]) => {
    if (entry) visibleRows.value = Math.max(0, Math.floor((entry.contentRect.height - 26) / 28))
  })
  if (container.value) resize.observe(container.value)
})
onUnmounted(() => resize?.disconnect())
const t = (key: Parameters<typeof translate>[1]) => translate(props.language, key)
const labels = computed(() => new Map(detectableKeys(keyboardLayout(props.platform)).map(key => [key.code, key.label || t('space')])))
function label(code: string) {
  if (code.startsWith('Mouse')) return t((['mouseLeft','mouseMiddle','mouseRight','mouseBack','mouseForward'] as const)[Number(code.slice(5))] ?? 'mouse')
  const modifier = /^(Control|Shift|Alt|Meta)(Left|Right)$/.test(code)
  const side = modifier ? (code.endsWith('Left') ? (props.language === 'zh-CN' ? '左' : 'Left') : (props.language === 'zh-CN' ? '右' : 'Right')) : ''
  return `${labels.value.get(code) ?? code}${side ? ` · ${side}` : ''}`
}
function time(at: number) {
  const date = new Date(at)
  return `${date.toLocaleTimeString(props.language, { hour12: false })}.${String(date.getMilliseconds()).padStart(3, '0')}`
}
</script>
<template>
  <section class="panel record-panel" :aria-label="t('records')"><header class="section-header"><h2><List :size="17" />{{ t('records') }}<span class="record-count">{{ session.records.length }}</span></h2><button type="button" class="quiet-button" :disabled="!session.records.length" :aria-label="t('clearLabel')" @click="emit('clear')"><Trash2 :size="14" />{{ t('clear') }}</button></header>
    <div ref="container" class="record-scroll"><table v-if="session.records.length"><thead><tr><th>{{ t('time') }}</th><th>{{ t('input') }}</th><th>{{ t('action') }}</th><th>{{ t('duration') }}</th></tr></thead><tbody><tr v-for="record in session.records.slice(0, visibleRows)" :key="record.id"><td class="timestamp">{{ time(record.at) }}</td><td :title="record.raw || record.code"><span class="record-key">{{ label(record.code) }}</span><small v-if="!labels.has(record.code) && !record.code.startsWith('Mouse') && record.raw && record.raw !== record.code" class="record-raw">{{ record.raw }}</small></td><td :class="['record-action', record.action]">{{ t(record.action) }}</td><td class="duration">{{ record.duration === undefined ? '—' : `${record.duration.toFixed(1)} ms` }}</td></tr></tbody></table><div v-else class="record-empty"><List :size="24" /><span>{{ t('empty') }}</span></div></div>
  </section>
</template>
