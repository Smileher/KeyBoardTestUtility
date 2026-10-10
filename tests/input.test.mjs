import { test } from 'node:test'
import assert from 'node:assert/strict'
import { createSession, acceptInput, releaseInputs, resetSession, normalizeBrowserCode, RECORD_LIMIT, isNewerVersion } from '../src/core/session.ts'
import { keyboardLayout, detectableKeys } from '../src/core/layouts.ts'

test('holds use monotonic elapsed time and repetitions do not restart the timer', () => {
  const session = createSession()
  acceptInput(session, { code:'KeyK', down:true, at:1000, monotonic:10 })
  acceptInput(session, { code:'KeyK', down:true, repeat:true, at:1300, monotonic:310 })
  acceptInput(session, { code:'KeyK', down:false, at:500, monotonic:610 })
  assert.equal(session.records[0].duration, 600)
  assert.equal(session.records[1].action, 'repeat')
  assert.equal(session.records[2].action, 'down')
  assert.equal(session.pressed.size, 0)
  assert.equal(session.tested.size, 1)
})
test('focus loss and isolated releases never invent a hold duration', () => {
  const session = createSession()
  acceptInput(session,{code:'Mouse0',down:true,at:100,monotonic:10})
  releaseInputs(session)
  assert.equal(acceptInput(session,{code:'Mouse0',down:false,at:200,monotonic:20}), false)
  assert.equal(session.records.length, 1)
  assert.equal(session.tested.has('Mouse0'), true)
  resetSession(session)
  assert.equal(session.records.length, 0)
  assert.equal(session.tested.size, 0)
})
test('records stay bounded and invalid timestamps cannot corrupt the session', () => {
  const session = createSession()
  for(let i=0;i<RECORD_LIMIT+20;i++) acceptInput(session,{code:'KeyA',down:true,at:i,monotonic:i})
  assert.equal(session.records.length,RECORD_LIMIT)
  assert.equal(session.records[0].id,RECORD_LIMIT+20)
  assert.equal(acceptInput(session,{code:'KeyB',down:true,at:NaN,monotonic:0}),false)
})
test('numpad navigation remains distinct and main navigation remains unchanged', () => {
  assert.equal(normalizeBrowserCode('Home','Home',3),'Numpad7')
  assert.equal(normalizeBrowserCode('Home','Home',0),'Home')
  assert.equal(normalizeBrowserCode('Numpad7','Home',3),'Numpad7')
  assert.equal(normalizeBrowserCode('Enter','Enter',3),'NumpadEnter')
})
test('full-size layouts have unique testable positions and firmware Fn is excluded', () => {
  const win=detectableKeys(keyboardLayout('win'))
  assert.equal(win.length,104)
  for(const platform of ['win','mac']) {
    const keys=detectableKeys(keyboardLayout(platform))
    assert.equal(new Set(keys.map(key=>key.code)).size,keys.length)
    assert.equal(keys.some(key=>key.code==='Fn'),false)
    assert.equal(keys.some(key=>key.code==='MetaRight'),true)
  }
})
test('release comparisons use semantic numeric order and reject prereleases', () => {
  assert.equal(isNewerVersion('v2.10.0','2.9.0'),true)
  assert.equal(isNewerVersion('v1.0.0','2.0.0'),false)
  assert.equal(isNewerVersion('v2.0.0','2.0.0'),false)
  assert.equal(isNewerVersion('v2.1.0-beta','2.0.0'),false)
})
test('keys outside the displayed layout retain raw codes and hold duration', () => {
  const session = createSession()
  const raw = 'VK 0xAF · SC 0x30 · E0'
  acceptInput(session, { code: 'AudioVolumeUp', raw, down: true, at: 100, monotonic: 10 })
  acceptInput(session, { code: 'AudioVolumeUp', raw, down: false, at: 180, monotonic: 90 })
  assert.equal(session.records[0].raw, raw)
  assert.equal(session.records[0].duration, 80)
  assert.equal(session.records[1].code, 'AudioVolumeUp')
  assert.equal(detectableKeys(keyboardLayout('win')).some(key => key.code === 'AudioVolumeUp'), false)
})
