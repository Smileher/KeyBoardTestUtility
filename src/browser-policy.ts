export function installBrowserPolicy(): () => void {
  const prevent = (event: Event) => event.preventDefault()
  const keyboard = (event: KeyboardEvent) => {
    const command = event.ctrlKey || event.metaKey
    const key = event.key.toLowerCase()
    if (['F1','F3','F5','F6','F7','F11','F12','ContextMenu','BrowserBack','BrowserForward','BrowserRefresh','BrowserHome'].includes(event.key)
      || (command && ['a','p','r','s','o','f','g','l','u','w','+','-','=','0','[',']'].includes(key))
      || (command && (event.shiftKey || event.altKey) && ['i','j','c','k'].includes(key))
      || (event.altKey && ['ArrowLeft','ArrowRight','Home'].includes(event.key))
      || event.key === 'Backspace') event.preventDefault()
  }
  const wheel = (event: WheelEvent) => { if (event.ctrlKey || event.metaKey) event.preventDefault() }
  const mouse = (event: MouseEvent) => { if ([1,3,4].includes(event.button)) event.preventDefault() }
  window.addEventListener('keydown', keyboard, true)
  window.addEventListener('wheel', wheel, { capture: true, passive: false })
  for (const type of ['contextmenu','selectstart','dragstart','dragover','drop','gesturestart','gesturechange']) window.addEventListener(type, prevent, { capture: true, passive: false })
  for (const type of ['mousedown','mouseup','auxclick'] as const) window.addEventListener(type, mouse, true)
  return () => {
    window.removeEventListener('keydown', keyboard, true)
    window.removeEventListener('wheel', wheel, true)
    for (const type of ['contextmenu','selectstart','dragstart','dragover','drop','gesturestart','gesturechange']) window.removeEventListener(type, prevent, true)
    for (const type of ['mousedown','mouseup','auxclick'] as const) window.removeEventListener(type, mouse, true)
  }
}
