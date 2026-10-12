<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import type { Language } from '../core/preferences'
import { translate } from '../i18n'
import { typingStats } from '../core/typing'
const props = defineProps<{ language: Language; active: boolean }>()
const t = (key: Parameters<typeof translate>[1]) => translate(props.language, key)
const text = ref('')
const elapsed = ref(0)
const composing = ref(false)
const finished = ref(false)
const passage = computed(() => t('typingSample'))
const stats = computed(() => typingStats(text.value, passage.value, elapsed.value))
const expected = computed(() => [...passage.value.normalize('NFC')])
const typed = computed(() => [...text.value.normalize('NFC')])
let started: number | undefined
let accumulated = 0
let timer: ReturnType<typeof setInterval> | undefined
function tick() { if (started !== undefined) elapsed.value = accumulated + performance.now() - started }
function pause() { tick(); accumulated = elapsed.value; started = undefined }
function begin() { if (!finished.value && props.active && started === undefined) started = performance.now() }
function reset() { started = undefined; accumulated = 0; elapsed.value = 0; text.value = ''; finished.value = false; composing.value = false }
function input(event: Event) {
  begin()
  if (composing.value) return
  text.value = (event.target as HTMLTextAreaElement).value
  tick()
  if (stats.value.complete) { pause(); finished.value = true }
}
function compositionEnd(event: CompositionEvent) { composing.value = false; input(event) }
watch(() => props.active, active => { if (!active) pause() })
watch(() => props.language, reset)
onMounted(() => { timer = setInterval(tick, 100) })
onUnmounted(() => { if (timer) clearInterval(timer) })
</script>
<template>
  <section class="panel typing-panel">
    <div class="typing-metrics diagnostic-metrics"><div><span>{{ t('speed') }}</span><strong>{{ Math.round(stats.cpm) }}</strong></div><div><span>{{ t('accuracy') }}</span><strong>{{ stats.accuracy.toFixed(1) }}%</strong></div><div><span>{{ t('characters') }}</span><strong>{{ stats.correct }} / {{ expected.length }}</strong></div><div><span>{{ t('elapsed') }}</span><strong>{{ (elapsed / 1000).toFixed(1) }} s</strong></div><button type="button" class="button" @click="reset">{{ t('reset') }}</button></div>
    <p class="typing-passage"><span v-for="(character, index) in expected" :key="index" :class="{ correct: typed[index] === character, incorrect: typed[index] !== undefined && typed[index] !== character, cursor: index === typed.length }">{{ character }}</span></p>
    <textarea v-model="text" :placeholder="t('typeHere')" :aria-label="t('typing')" :maxlength="expected.length * 2" :readonly="finished" spellcheck="false" autocomplete="off" autocapitalize="off" @beforeinput="begin" @input="input" @compositionstart="composing = true; begin()" @compositionend="compositionEnd" @blur="pause" />
    <p v-if="finished" class="success-text" role="status">{{ t('finished') }}</p>
  </section>
</template>
