export type InputAction = 'down' | 'up' | 'repeat'
export type InputEvent = { code: string; raw?: string; down: boolean; repeat?: boolean; at: number; monotonic: number; source?: 'browser' | 'native'; dispatchDelayMs?: number }
export type InputRecord = { id: number; code: string; raw?: string; action: InputAction; at: number; duration?: number }
export type Session = {
  pressed: Map<string, number>
  tested: Set<string>
  records: InputRecord[]
  sequence: number
}

export const RECORD_LIMIT = 1000
export function createSession(): Session {
  return { pressed: new Map(), tested: new Set(), records: [], sequence: 0 }
}

// 单调时间只用于持续时长，墙上时间只用于显示；长按重复不重置首次按下时间。
export function acceptInput(session: Session, input: InputEvent): boolean {
  if (!input.code || !Number.isFinite(input.at) || !Number.isFinite(input.monotonic)) return false
  const started = session.pressed.get(input.code)
  let action: InputAction
  let duration: number | undefined
  if (input.down) {
    action = started === undefined ? 'down' : 'repeat'
    if (started === undefined) session.pressed.set(input.code, input.monotonic)
    session.tested.add(input.code)
  } else {
    // 失焦后收到的孤立松开事件不伪造一次按键，也不计算不可靠时长。
    if (started === undefined) return false
    action = 'up'
    duration = Math.max(0, input.monotonic - started)
    session.pressed.delete(input.code)
  }
  session.records.unshift({ id: ++session.sequence, code: input.code, raw: input.raw, action, at: input.at, duration })
  if (session.records.length > RECORD_LIMIT) session.records.length = RECORD_LIMIT
  return true
}

export function releaseInputs(session: Session): void { session.pressed.clear() }
export function resetSession(session: Session): void {
  session.pressed.clear()
  session.tested.clear()
  session.records.length = 0
}

export function normalizeBrowserCode(code: string, key: string, location: number): string {
  if (location !== 3 || code.startsWith('Numpad')) return code
  const navigation: Record<string, string> = {
    Insert: 'Numpad0', End: 'Numpad1', ArrowDown: 'Numpad2', PageDown: 'Numpad3',
    ArrowLeft: 'Numpad4', Clear: 'Numpad5', ArrowRight: 'Numpad6', Home: 'Numpad7',
    ArrowUp: 'Numpad8', PageUp: 'Numpad9', Delete: 'NumpadDecimal', Enter: 'NumpadEnter',
  }
  return navigation[key] ?? code
}

export function isNewerVersion(candidate: string, current: string): boolean {
  if (!/^v?\d+\.\d+\.\d+$/.test(candidate) || !/^\d+\.\d+\.\d+$/.test(current)) return false
  const next = candidate.replace(/^v/, '').split('.').map(Number)
  const previous = current.split('.').map(Number)
  for (let i = 0; i < 3; i++) {
    if (next[i] !== previous[i]) return next[i]! > previous[i]!
  }
  return false
}
