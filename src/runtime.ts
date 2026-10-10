import { invoke, isTauri } from '@tauri-apps/api/core'
import { listen, type UnlistenFn } from '@tauri-apps/api/event'
import { getCurrentWindow } from '@tauri-apps/api/window'
import { openUrl } from '@tauri-apps/plugin-opener'
import type { InputEvent } from './core/session'

export const desktop = isTauri()
export const projectUrl = 'https://github.com/Smileher/KeyBoardTestUtility'
export const websiteUrl = 'https://smileher.github.io/KeyBoardTestUtility/'
export const storeUrl = 'https://apps.microsoft.com/detail/9NKRGTGGQWSD'
export type RuntimeInfo = { nativeKeyboard: boolean; store: boolean; locks?: { num: boolean; caps: boolean; scroll: boolean } | null }

export async function runtimeInfo(): Promise<RuntimeInfo> {
  return desktop ? invoke<RuntimeInfo>('runtime_info') : { nativeKeyboard: false, store: false }
}
export async function nativeInputs(callback: (input: InputEvent) => void): Promise<UnlistenFn> {
  return listen<InputEvent>('keyboard-input', event => callback(event.payload))
}
export async function setCapture(active: boolean): Promise<void> {
  if (desktop) await invoke('set_capture', { active })
}
export async function desktopFocus(callback: (focused: boolean) => void): Promise<UnlistenFn> {
  const window = getCurrentWindow()
  const unlisten = await window.onFocusChanged(event => callback(event.payload))
  callback(await window.isFocused())
  return unlisten
}
export async function visit(url: string): Promise<void> {
  if (desktop) await openUrl(url)
  else window.open(url, '_blank', 'noopener,noreferrer')
}
