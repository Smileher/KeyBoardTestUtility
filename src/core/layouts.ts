export type PlatformLayout = 'win' | 'mac'
export type KeyDefinition = { code: string; label: string; width?: number; height?: number; row?: number; column?: number; detectable?: boolean }
export type KeyboardLayout = { main: KeyDefinition[][]; navigation: KeyDefinition[][]; numpad: KeyDefinition[] }

const key = (code: string, label: string, width = 1): KeyDefinition => ({ code, label, width })
const gap = (width = 1): KeyDefinition => ({ code: '', label: '', width, detectable: false })
const letters = (value: string) => [...value].map(letter => key(`Key${letter}`, letter))

export function keyboardLayout(platform: PlatformLayout): KeyboardLayout {
  const mac = platform === 'mac'
  const main = [
    [key('Escape', 'Esc'), gap(), ...Array.from({ length: 4 }, (_, i) => key(`F${i + 1}`, `F${i + 1}`)), gap(.5), ...Array.from({ length: 4 }, (_, i) => key(`F${i + 5}`, `F${i + 5}`)), gap(.5), ...Array.from({ length: 4 }, (_, i) => key(`F${i + 9}`, `F${i + 9}`))],
    [key('Backquote', '` ~'), ...'1234567890'.split('').map(value => key(`Digit${value}`, value)), key('Minus', '- _'), key('Equal', '= +'), key('Backspace', 'Backspace', 2)],
    [key('Tab', 'Tab', 1.5), ...letters('QWERTYUIOP'), key('BracketLeft', '[ {'), key('BracketRight', '] }'), key('Backslash', '\\ |', 1.5)],
    [key('CapsLock', 'Caps', 1.75), ...letters('ASDFGHJKL'), key('Semicolon', '; :'), key('Quote', "' \""), key('Enter', 'Enter', 2.25)],
    [key('ShiftLeft', 'Shift', 2.25), ...letters('ZXCVBNM'), key('Comma', ', <'), key('Period', '. >'), key('Slash', '/ ?'), key('ShiftRight', 'Shift', 2.75)],
    [key('ControlLeft', mac ? '⌃' : 'Ctrl', 1.25), key('MetaLeft', mac ? '⌘' : 'Win', 1.25), key('AltLeft', mac ? '⌥' : 'Alt', 1.25), key('Space', '', 6.25), key('AltRight', mac ? '⌥' : 'Alt', 1.25), key('MetaRight', mac ? '⌘' : 'Win', 1.25), key('ContextMenu', 'Menu', 1.25), key('ControlRight', mac ? '⌃' : 'Ctrl', 1.25)],
  ]
  const navigation = [
    [key('PrintScreen', 'PrtSc'), key('ScrollLock', 'ScrLk'), key('Pause', 'Pause')],
    [key('Insert', 'Ins'), key('Home', 'Home'), key('PageUp', 'PgUp')],
    [key('Delete', 'Del'), key('End', 'End'), key('PageDown', 'PgDn')],
    [gap(), gap(), gap()], [gap(), key('ArrowUp', '↑'), gap()], [key('ArrowLeft', '←'), key('ArrowDown', '↓'), key('ArrowRight', '→')],
  ]
  const pad = (code: string, label: string, column: number, row: number, height = 1, width = 1): KeyDefinition => ({ code, label, column, row, height, width })
  const numpad = [
    pad('NumLock', 'Num', 1, 2), pad('NumpadDivide', '/', 2, 2),
    pad('NumpadMultiply', '*', 3, 2), pad('NumpadSubtract', '-', 4, 2),
    pad('Numpad7', '7', 1, 3), pad('Numpad8', '8', 2, 3), pad('Numpad9', '9', 3, 3),
    pad('NumpadAdd', '+', 4, 3, 2),
    pad('Numpad4', '4', 1, 4), pad('Numpad5', '5', 2, 4), pad('Numpad6', '6', 3, 4),
    pad('Numpad1', '1', 1, 5), pad('Numpad2', '2', 2, 5), pad('Numpad3', '3', 3, 5), pad('NumpadEnter', 'Enter', 4, 5, 2),
    pad('Numpad0', '0', 1, 6, 1, 2), pad('NumpadDecimal', '.', 3, 6),
  ]
  return { main, navigation, numpad }
}

export function detectableKeys(layout: KeyboardLayout): KeyDefinition[] {
  return [...layout.main.flat(), ...layout.navigation.flat(), ...layout.numpad].filter(key => key.code && key.detectable !== false)
}
