<script setup lang="ts">
import { computed } from 'vue'
import type { Diagnostics, TestMode } from '../core/diagnostics'
import { latencyStats } from '../core/diagnostics'
import type { Language } from '../core/preferences'
import { translate } from '../i18n'
const props = defineProps<{ mode: TestMode; state: Diagnostics; language: Language; labels: Map<string, string>; native: boolean }>()
const emit = defineEmits<{ toggle: []; combo: []; threshold: [value: number]; reset: [] }>()
const t = (key: Parameters<typeof translate>[1]) => translate(props.language, key)
const sources = ['browser', 'native'] as const
const stats = computed(() => ({ browser: latencyStats(props.state.latency.browser), native: latencyStats(props.state.latency.native) }))
const samples = computed(() => props.state.latency[props.native ? 'native' : 'browser'])
const scale = computed(() => Math.max(1, ...samples.value))
function label(code: string) { return props.labels.get(code) || code }
function selectThreshold(event: Event) {
  const select = event.target as HTMLSelectElement
  emit('threshold', Number(select.value))
  select.blur()
}
</script>
<template>
  <section class="panel diagnostic-panel">
    <template v-if="mode === 'chatter' || mode === 'drop'">
      <div class="diagnostic-controls">
        <label class="threshold-control">{{ t('threshold') }}<select :value="state.threshold" @change="selectThreshold"><option v-for="value in [30, 50, 80, 100, 150]" :key="value" :value="value">{{ value }} ms</option></select></label>
        <template v-if="mode === 'drop'"><button type="button" class="button primary-button" @click="emit('toggle')">{{ t(state.running ? 'stop' : 'start') }}</button><span class="status-pill">{{ t(state.running ? 'running' : 'ready') }}</span><span>{{ t('target') }}: <strong>{{ state.target ? label(state.target) : t('chooseTarget') }}</strong></span></template>
      </div>
      <div class="diagnostic-metrics"><div><span>{{ t('suspects') }}</span><strong>{{ state.total }}</strong></div><template v-if="mode === 'drop'"><div><span>{{ t('transitions') }}</span><strong>{{ state.transitions }}</strong></div><div><span>{{ t('elapsed') }}</span><strong>{{ (state.elapsed / 1000).toFixed(1) }} s</strong></div></template><p v-if="!state.anomalies.length" class="muted">{{ t('noSuspects') }}</p><div v-else class="anomaly-latest"><span>{{ label(state.anomalies[0]!.code) }}</span><strong>{{ state.anomalies[0]!.gap.toFixed(1) }} ms</strong></div></div>
      <div v-if="state.anomalies.length" class="anomaly-list"><span v-for="(item, index) in state.anomalies.slice(0, 12)" :key="index">{{ label(item.code) }} · {{ item.gap.toFixed(1) }} ms</span></div>
    </template>
    <template v-else-if="mode === 'rollover'">
      <div class="diagnostic-controls"><span>{{ t('expected') }}</span><div class="combo-keys"><kbd v-for="code in state.combo" :key="code">{{ label(code) }}</kbd></div><button type="button" class="button" @click="emit('combo')">{{ t(state.recordingCombo ? 'comboFinish' : 'comboRecord') }}</button></div>
      <div class="diagnostic-metrics"><div><span>{{ t('maxHeld') }}</span><strong>{{ state.maxHeld }}</strong></div><p :class="{ 'success-text': state.comboPassed }">{{ t(state.comboPassed ? 'comboPassed' : 'comboWaiting') }}</p></div>
    </template>
    <template v-else-if="mode === 'latency'">
      <div class="diagnostic-controls latency-heading"><span>{{ t(native ? 'nativeMode' : 'webMode') }}</span><button type="button" class="button" @click="emit('reset')">{{ t('reset') }}</button></div>
      <div class="latency-sources"><div v-for="source in sources.filter(value => value === 'browser' || native || state.latency.native.length)" :key="source" class="latency-source"><h2>{{ t(source === 'native' ? 'nativeMode' : 'webMode') }}</h2><div class="diagnostic-metrics"><div><span>{{ t('samples') }}</span><strong>{{ stats[source].count }}</strong></div><div v-for="metric in ['average', 'p95', 'max'] as const" :key="metric"><span>{{ t(metric === 'max' ? 'maximum' : metric) }}</span><strong>{{ stats[source].count ? stats[source][metric].toFixed(2) : '—' }}<small> ms</small></strong></div></div></div></div>
      <div class="latency-chart" role="img" :aria-label="`${t('samples')}: ${samples.length}, ${t('maximum')}: ${scale.toFixed(2)} ms`"><i v-for="(sample, index) in samples" :key="index" :style="{ height: `${Math.max(2, sample / scale * 100)}%` }" :title="`${sample.toFixed(2)} ms`" /><span v-if="!samples.length" class="muted">{{ t('noSamples') }}</span></div>
    </template>
  </section>
</template>
