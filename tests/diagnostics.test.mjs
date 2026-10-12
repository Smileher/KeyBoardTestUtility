import test from 'node:test'
import assert from 'node:assert/strict'
import { createSession, acceptInput, releaseInputs } from '../src/core/session.ts'
import { createDiagnostics, observeInput, interruptDiagnostics, browserDispatchDelay, latencyStats } from '../src/core/diagnostics.ts'
import { keyboardLayout, detectableKeys, layoutIds } from '../src/core/layouts.ts'
import { typingStats } from '../src/core/typing.ts'
import { messages } from '../src/i18n.ts'
import { languages } from '../src/core/preferences.ts'

function recorder(mode) {
  const state = createDiagnostics(), session = createSession()
  const input = (code, down, monotonic, extra = {}) => {
    const event = { code, down, monotonic, at: monotonic + 1000, ...extra }
    if (acceptInput(session, event)) observeInput(state, mode, event, session)
  }
  return { state, session, input }
}
test('chatter requires an observed release and ignores repeat and threshold boundary', () => {
  const { state, input } = recorder('chatter')
  input('KeyA', true, 0); input('KeyA', true, 10, { repeat: true })
  assert.equal(state.total, 0)
  input('KeyA', false, 100); input('KeyA', true, 179)
  assert.equal(state.total, 1)
  input('KeyA', false, 200); input('KeyA', true, 280)
  assert.equal(state.total, 1)
  input('KeyB', false, 300); input('KeyB', true, 310)
  assert.equal(state.total, 1)
})
test('focus loss cancels short-gap pairing and does not create dropout reports', () => {
  const { state, session, input } = recorder('drop')
  state.running = true
  input('KeyA', true, 10); input('KeyA', false, 20)
  interruptDiagnostics(state); releaseInputs(session)
  input('KeyA', true, 30)
  assert.equal(state.total, 0)
  assert.equal(state.running, false)
})
test('drop test observes only its chosen key and skips OS repeat', () => {
  const { state, input } = recorder('drop')
  input('KeyB', true, 0)
  assert.equal(state.target, '')
  state.running = true
  input('KeyA', true, 10); input('KeyB', false, 20); input('KeyB', true, 21)
  input('KeyA', true, 100, { repeat: true }); input('KeyA', false, 200); input('KeyA', true, 220)
  assert.equal(state.target, 'KeyA')
  assert.equal(state.total, 1)
  assert.equal(state.transitions, 3)
})
test('rollover success requires selected keys simultaneously, not just a high count', () => {
  const { state, input } = recorder('rollover')
  for (const code of ['KeyB', 'KeyC', 'KeyD', 'KeyE']) input(code, true, 0)
  assert.equal(state.maxHeld, 4)
  assert.equal(state.comboPassed, false)
  for (const code of state.combo) input(code, true, 10)
  assert.equal(state.comboPassed, true)
})
test('latency clocks and sources remain separate and samples stay bounded', () => {
  assert.equal(browserDispatchDelay(10, 15, 1e12), 5)
  assert.equal(browserDispatchDelay(1_700_000_000_010, 15, 1_700_000_000_000), 5)
  assert.equal(browserDispatchDelay(20, 15, 0), undefined)
  assert.equal(browserDispatchDelay(NaN, 15, 0), undefined)
  const { state, input } = recorder('latency')
  input('KeyA', true, 0, { source: 'native', dispatchDelayMs: 2 }); input('KeyA', false, 1)
  for (let i = 0; i < 130; i++) { input('KeyA', true, i * 2 + 10, { source: 'browser', dispatchDelayMs: i }); input('KeyA', false, i * 2 + 11) }
  assert.deepEqual(state.latency.native, [2])
  assert.equal(state.latency.browser.length, 100)
  assert.equal(state.latency.browser[0], 30)
  assert.deepEqual(latencyStats([1, 2, 3, 4]), { count: 4, average: 2.5, p95: 4, max: 4 })
})
test('diagnostic anomaly history is bounded', () => {
  const { state, input } = recorder('chatter')
  for (let i = 0; i < 120; i++) { input('KeyA', true, i * 2); input('KeyA', false, i * 2 + 1) }
  assert.equal(state.total, 119)
  assert.equal(state.anomalies.length, 100)
})
test('regional legends keep physical key identity and each main row fits 15 units', () => {
  const label = (region, code) => detectableKeys(keyboardLayout('win', region)).find(key => key.code === code).label
  assert.equal(label('de', 'KeyY'), 'Z'); assert.equal(label('de', 'Backquote'), '^ °')
  assert.equal(label('fr', 'KeyQ'), 'A'); assert.equal(label('fr', 'KeyA'), 'Q')
  for (const platform of ['win', 'mac']) for (const region of layoutIds) {
    const layout = keyboardLayout(platform, region)
    for (const row of layout.main) assert.equal(row.reduce((sum, key) => sum + key.width, 0), 15, `${platform}/${region}`)
    if (['uk', 'de', 'fr', 'jp'].includes(region)) {
      assert.equal(layout.main.flat().find(key => key.code === 'Enter').height, 2)
      assert.ok(layout.main.flat().some(key => key.code === 'Backslash'))
    }
    if (region === 'jp') for (const code of ['IntlRo', 'IntlYen', ...(platform === 'mac' ? ['Lang1', 'Lang2'] : ['Convert', 'NonConvert', 'KanaMode'])]) assert.ok(detectableKeys(layout).some(key => key.code === code))
  }
})
test('typing counts Unicode characters and normalizes composed text', () => {
  assert.deepEqual(typingStats('e\u0301猫😀', 'é猫😀', 60000), { correct: 3, total: 3, accuracy: 100, cpm: 3, complete: true })
  assert.equal(typingStats('cat', 'car', 30000).correct, 2)
  assert.equal(typingStats('', 'car', 0).cpm, 0)
})
test('Apple JIS relocates control and Fn instead of reusing Windows geometry', () => {
  const mac = keyboardLayout('mac', 'jp')
  assert.equal(mac.main[1][0].code, 'Digit1')
  assert.equal(mac.main[3][0].code, 'ControlLeft')
  assert.equal(mac.main[5][0].code, 'CapsLock')
  assert.equal(mac.main[5].at(-1).code, 'Fn')
  assert.equal(detectableKeys(mac).some(key => key.code === 'Backquote'), false)
  assert.equal(mac.main.flat().find(key => key.code === 'Enter').width, 2)
})
test('every supported language has a complete nonempty UI dictionary', () => {
  const keys = Object.keys(messages.en).sort()
  for (const language of languages) {
    assert.deepEqual(Object.keys(messages[language]).sort(), keys, language)
    for (const text of Object.values(messages[language])) assert.ok(typeof text === 'string' && text.trim().length)
  }
})
