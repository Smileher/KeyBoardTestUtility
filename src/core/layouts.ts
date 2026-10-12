export type PlatformLayout = 'win' | 'mac'
export const layoutIds = ['us', 'uk', 'de', 'fr', 'jp'] as const
export type LayoutId = typeof layoutIds[number]
export type KeyDefinition = { code: string; label: string; width?: number; height?: number; row?: number; column?: number; detectable?: boolean; shape?: 'iso' }
export type KeyboardLayout = { main: KeyDefinition[][]; navigation: KeyDefinition[][]; numpad: KeyDefinition[]; geometry: 'ansi' | 'iso' | 'jis' }
const key = (code: string, label: string, width = 1): KeyDefinition => ({ code, label, width })
const gap = (width = 1): KeyDefinition => ({ code: '', label: '', width, detectable: false })
const letters = (value: string) => [...value].map(letter => key(`Key${letter}`, letter))
const legends: Record<LayoutId, Record<string, string>> = {
  us: { Backquote: '` ~', Digit1: '1 !', Digit2: '2 @', Digit3: '3 #', Digit4: '4 $', Digit5: '5 %', Digit6: '6 ^', Digit7: '7 &', Digit8: '8 *', Digit9: '9 (', Digit0: '0 )' },
  uk: { Backquote: '` ¬', Digit1: '1 !', Digit2: '2 "', Digit3: '3 £', Digit4: '4 $', Digit5: '5 %', Digit6: '6 ^', Digit7: '7 &', Digit8: '8 *', Digit9: '9 (', Digit0: '0 )', Quote: "' @", Backslash: '# ~', IntlBackslash: '\\ |' },
  de: { Backquote: '^ °', Digit1: '1 !', Digit2: '2 "', Digit3: '3 §', Digit4: '4 $', Digit5: '5 %', Digit6: '6 &', Digit7: '7 /', Digit8: '8 (', Digit9: '9 )', Digit0: '0 =', Minus: 'ß ?', Equal: '´ `', KeyY: 'Z', KeyZ: 'Y', BracketLeft: 'Ü', BracketRight: '+ *', Backslash: '# \'', Semicolon: 'Ö', Quote: 'Ä', IntlBackslash: '< >', Comma: ', ;', Period: '. :', Slash: '- _' },
  fr: { Backquote: '²', Digit1: '& 1', Digit2: 'é 2', Digit3: '" 3', Digit4: "' 4", Digit5: '( 5', Digit6: '- 6', Digit7: 'è 7', Digit8: '_ 8', Digit9: 'ç 9', Digit0: 'à 0', Minus: ') °', Equal: '= +', KeyQ: 'A', KeyW: 'Z', KeyA: 'Q', KeyZ: 'W', KeyM: ', ?', BracketLeft: '^ ¨', BracketRight: '$ £', Backslash: '* µ', Semicolon: 'M', Quote: 'ù %', IntlBackslash: '< >', Comma: '; .', Period: ': /', Slash: '! §' },
  jp: { Backquote: '半角 / 全角', Digit1: '1 !', Digit2: '2 "', Digit3: '3 #', Digit4: '4 $', Digit5: '5 %', Digit6: '6 &', Digit7: "7 '", Digit8: '8 (', Digit9: '9 )', Digit0: '0', Minus: '- =', Equal: '^ ~', IntlYen: '¥ |', BracketLeft: '@ `', BracketRight: '[ {', Backslash: '] }', Semicolon: '; +', Quote: ': *', Comma: ', <', Period: '. >', Slash: '/ ?', IntlRo: '\\ _' },
}

export function keyboardLayout(platform: PlatformLayout, region: LayoutId = 'us'): KeyboardLayout {
  const mac = platform === 'mac'
  const iso = ['uk', 'de', 'fr'].includes(region)
  const jis = region === 'jp'
  const main: KeyDefinition[][] = [
    mac ? [key('Escape', 'esc', 1.5), ...Array.from({ length: 12 }, (_, i) => key(`F${i + 1}`, `F${i + 1}`)), { ...key('TouchID', 'Touch ID', 1.5), detectable: false }]
      : [key('Escape', 'Esc'), gap(), ...Array.from({ length: 4 }, (_, i) => key(`F${i + 1}`, `F${i + 1}`)), gap(.5), ...Array.from({ length: 4 }, (_, i) => key(`F${i + 5}`, `F${i + 5}`)), gap(.5), ...Array.from({ length: 4 }, (_, i) => key(`F${i + 9}`, `F${i + 9}`))],
    [key('Backquote', '` ~'), ...'1234567890'.split('').map(value => key(`Digit${value}`, value)), key('Minus', '- _'), key('Equal', '= +'), ...(jis ? [key('IntlYen', '¥ |'), key('Backspace', mac ? '⌫ delete' : 'Backspace')] : [key('Backspace', mac ? '⌫ delete' : 'Backspace', 2)])],
    [key('Tab', mac ? '⇥ tab' : 'Tab', 1.5), ...letters('QWERTYUIOP'), key('BracketLeft', '[ {'), key('BracketRight', '] }'), ...(iso || jis ? [{ ...key('Enter', mac ? '↩ return' : 'Enter', 1.5), height: 2, shape: 'iso' as const }] : [key('Backslash', '\\ |', 1.5)])],
    [key('CapsLock', mac ? '⇪ caps lock' : 'Caps', 1.75), ...letters('ASDFGHJKL'), key('Semicolon', '; :'), key('Quote', "' \""), ...(iso || jis ? [key('Backslash', '\\ |'), gap(1.25)] : [key('Enter', mac ? '↩ return' : 'Enter', 2.25)])],
    [key('ShiftLeft', mac ? '⇧ shift' : 'Shift', iso ? 1.25 : 2.25), ...(iso ? [key('IntlBackslash', '< >')] : []), ...letters('ZXCVBNM'), key('Comma', ', <'), key('Period', '. >'), key('Slash', '/ ?'), ...(jis ? [key('IntlRo', '\\ _')] : []), key('ShiftRight', mac ? '⇧ shift' : 'Shift', jis ? 1.75 : 2.75)],
    mac ? [{ ...key('Fn', '🌐 fn'), detectable: false }, key('ControlLeft', '⌃ control'), key('AltLeft', '⌥ option'), key('MetaLeft', '⌘ command', 1.25), ...(jis ? [key('Lang2', '英数'), key('Space', '', 4.25), key('Lang1', 'かな')] : [key('Space', '', 6.25)]), key('MetaRight', '⌘ command', 1.5), key('AltRight', '⌥ option', 1.5), key('ControlRight', '⌃ control', 1.5)]
      : [key('ControlLeft', 'Ctrl', 1.25), key('MetaLeft', 'Win', 1.25), key('AltLeft', 'Alt', 1.25), ...(jis ? [key('NonConvert', '無変換'), key('Space', '', 3.25), key('Convert', '変換'), key('KanaMode', 'かな')] : [key('Space', '', 6.25)]), key('AltRight', region === 'us' ? 'Alt' : 'AltGr', 1.25), key('MetaRight', 'Win', 1.25), key('ContextMenu', 'Menu', 1.25), key('ControlRight', 'Ctrl', 1.25)],
  ]
  // Apple JIS 将 control 移到字母区左侧，Fn 位于最右侧；数字行没有半角/全角键。
  if (mac && jis) {
    main[1] = [...'1234567890'.split('').map(value => key(`Digit${value}`, value)), key('Minus', '- ='), key('Equal', '^ ~'), key('IntlYen', '¥ |'), key('Backspace', '⌫ delete', 2)]
    main[2] = [key('Tab', '⇥ tab'), ...letters('QWERTYUIOP'), key('BracketLeft', '@ `'), key('BracketRight', '[ {'), { ...key('Enter', '↩ return', 2), height: 2, shape: 'iso' }]
    main[3] = [key('ControlLeft', '⌃ control', 1.25), ...letters('ASDFGHJKL'), key('Semicolon', '; +'), key('Quote', ': *'), key('Backslash', '] }'), gap(1.75)]
    main[4] = [key('ShiftLeft', '⇧ shift', 1.75), ...letters('ZXCVBNM'), key('Comma', ', <'), key('Period', '. >'), key('Slash', '/ ?'), key('IntlRo', '\\ _'), key('ShiftRight', '⇧ shift', 2.25)]
    main[5] = [key('CapsLock', '⇪ caps lock'), key('AltLeft', '⌥ option'), key('MetaLeft', '⌘ command', 1.25), key('Lang2', '英数', 1.25), key('Space', '', 4), key('Lang1', 'かな', 1.25), key('MetaRight', '⌘ command', 1.25), key('AltRight', '⌥ option', 1.5), key('ControlRight', '⌃ control', 1.5), { ...key('Fn', 'fn 🌐'), detectable: false }]
  }
  // 图例随地区变化，事件始终按物理 code 对齐，避免 QWERTZ/AZERTY 按字符错位。
  const regionalLegends = { ...legends.us, ...legends[region] }
  if (mac && region === 'fr') Object.assign(regionalLegends, { Backquote: '@ #', Digit6: '§ 6', Digit8: '! 8', Equal: '- _', BracketRight: '$ *', Backslash: '` £', Slash: '= +' })
  if (mac && region === 'uk') Object.assign(regionalLegends, { Backquote: '§ ±', Digit2: '2 @', Quote: "' \"", Backslash: '\\ |', IntlBackslash: '` ~' })
  main.forEach((row, index) => {
    let column = 1
    row.forEach(definition => {
      definition.label = regionalLegends[definition.code] ?? definition.label
      definition.column = column
      definition.row = index + 1
      column += (definition.width ?? 1) * 4
    })
  })
  const navigation = [
    mac ? [key('F13', 'F13'), key('F14', 'F14'), key('F15', 'F15')] : [key('PrintScreen', 'PrtSc'), key('ScrollLock', 'ScrLk'), key('Pause', 'Pause')],
    [key(mac ? 'Help' : 'Insert', mac ? 'help' : 'Ins'), key('Home', mac ? '↖ home' : 'Home'), key('PageUp', mac ? '⇞ page up' : 'PgUp')],
    [key('Delete', mac ? '⌦ delete' : 'Del'), key('End', mac ? '↘ end' : 'End'), key('PageDown', mac ? '⇟ page down' : 'PgDn')],
    [gap(), gap(), gap()], [gap(), key('ArrowUp', '↑'), gap()], [key('ArrowLeft', '←'), key('ArrowDown', '↓'), key('ArrowRight', '→')],
  ]
  const pad = (code: string, label: string, column: number, row: number, height = 1, width = 1): KeyDefinition => ({ code, label, column, row, height, width })
  const numpad = [
    ...(mac ? Array.from({ length: 4 }, (_, i) => pad(`F${i + 16}`, `F${i + 16}`, i + 1, 1)) : []),
    pad('NumLock', mac ? 'clear' : 'Num', 1, 2), pad(mac ? 'NumpadEqual' : 'NumpadDivide', mac ? '=' : '/', 2, 2), pad(mac ? 'NumpadDivide' : 'NumpadMultiply', mac ? '/' : '*', 3, 2), pad(mac ? 'NumpadMultiply' : 'NumpadSubtract', mac ? '*' : '-', 4, 2),
    pad('Numpad7', '7', 1, 3), pad('Numpad8', '8', 2, 3), pad('Numpad9', '9', 3, 3), pad(mac ? 'NumpadSubtract' : 'NumpadAdd', mac ? '−' : '+', 4, 3, mac ? 1 : 2),
    pad('Numpad4', '4', 1, 4), pad('Numpad5', '5', 2, 4), pad('Numpad6', '6', 3, 4), ...(mac ? [pad('NumpadAdd', '+', 4, 4)] : []),
    pad('Numpad1', '1', 1, 5), pad('Numpad2', '2', 2, 5), pad('Numpad3', '3', 3, 5), pad('NumpadEnter', mac ? '⌤ enter' : 'Enter', 4, 5, 2), pad('Numpad0', '0', 1, 6, 1, 2), pad('NumpadDecimal', region === 'de' || region === 'fr' ? ',' : '.', 3, 6),
  ]
  return { main, navigation, numpad, geometry: jis ? 'jis' : iso ? 'iso' : 'ansi' }
}

export function detectableKeys(layout: KeyboardLayout): KeyDefinition[] {
  return [...layout.main.flat(), ...layout.navigation.flat(), ...layout.numpad].filter(key => key.code && key.detectable !== false)
}
