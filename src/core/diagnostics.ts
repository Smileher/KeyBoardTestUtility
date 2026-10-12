import type { InputEvent, Session } from './session'

export const testModes = ['keys', 'chatter', 'rollover', 'drop', 'latency', 'typing', 'mouse'] as const
export type TestMode = typeof testModes[number]
export type Anomaly = { code: string; gap: number; at: number }
export type Diagnostics = {
  released: Map<string, number>; anomalies: Anomaly[]; total: number; threshold: number
  maxHeld: number; combo: string[]; comboPassed: boolean; recordingCombo: boolean
  running: boolean; target: string; started?: number; elapsed: number; transitions: number
  latency: { browser: number[]; native: number[] }
}
export function createDiagnostics(): Diagnostics {
  return { released: new Map(), anomalies: [], total: 0, threshold: 80, maxHeld: 0, combo: ['KeyW', 'KeyA', 'ShiftLeft', 'Space'], comboPassed: false, recordingCombo: false, running: false, target: '', elapsed: 0, transitions: 0, latency: { browser: [], native: [] } }
}
// 失焦、输入来源变化或切换测试时丢弃配对，避免把不可观测的间隔报告为故障。
export function interruptDiagnostics(state: Diagnostics): void {
  state.released.clear()
  state.running = false
  state.started = undefined
  state.recordingCombo = false
}
export function browserDispatchDelay(timestamp: number, now: number, timeOrigin: number): number | undefined {
  const normalized = timestamp > 1e12 ? timestamp - timeOrigin : timestamp
  const delay = now - normalized
  return Number.isFinite(delay) && timestamp > 0 && delay >= 0 && delay < 60_000 ? delay : undefined
}
export function observeInput(state: Diagnostics, mode: TestMode, input: InputEvent, session: Session): void {
  const action = session.records[0]?.action
  if (!action || input.code.startsWith('Mouse')) return
  if (mode === 'rollover') {
    state.maxHeld = Math.max(state.maxHeld, session.pressed.size)
    if (state.recordingCombo && action === 'down' && !state.combo.includes(input.code)) state.combo.push(input.code)
    if (!state.recordingCombo && state.combo.length > 0 && state.combo.every(code => session.pressed.has(code))) state.comboPassed = true
  }
  if ((mode === 'chatter' || mode === 'drop') && (mode !== 'drop' || state.running)) {
    if (mode === 'drop' && !state.target && action === 'down') state.target = input.code
    if (mode === 'drop' && input.code !== state.target) return
    if (mode === 'drop') {
      state.started ??= input.monotonic
      state.elapsed = Math.max(0, input.monotonic - state.started)
      if (action !== 'repeat') state.transitions++
    }
    if (action === 'down' && !input.repeat) {
      const released = state.released.get(input.code)
      const gap = released === undefined ? undefined : input.monotonic - released
      if (gap !== undefined && gap >= 0 && gap < state.threshold) {
        state.total++
        state.anomalies.unshift({ code: input.code, gap, at: input.at })
        if (state.anomalies.length > 100) state.anomalies.length = 100
      }
      state.released.delete(input.code)
    } else if (action === 'up') {
      state.released.set(input.code, input.monotonic)
      if (state.released.size > 200) state.released.delete(state.released.keys().next().value!)
    }
  }
  if (mode === 'latency' && action === 'down' && !input.repeat && input.dispatchDelayMs !== undefined && Number.isFinite(input.dispatchDelayMs) && input.dispatchDelayMs >= 0) {
    const samples = state.latency[input.source === 'native' ? 'native' : 'browser']
    samples.push(input.dispatchDelayMs)
    if (samples.length > 100) samples.shift()
  }
}
export function latencyStats(samples: number[]) {
  const sorted = [...samples].sort((a, b) => a - b)
  return { count: samples.length, average: samples.length ? samples.reduce((sum, value) => sum + value, 0) / samples.length : 0, p95: sorted[Math.max(0, Math.ceil(sorted.length * .95) - 1)] ?? 0, max: sorted.at(-1) ?? 0 }
}
