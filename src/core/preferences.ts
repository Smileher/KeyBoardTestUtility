import { layoutIds, type LayoutId, type PlatformLayout } from './layouts.ts'

export const accents = ['mint', 'blue', 'violet', 'amber', 'cyan', 'rose', 'coral', 'graphite'] as const
export type Accent = typeof accents[number]
export type Theme = 'system' | 'light' | 'dark'
export const languages = ['zh-CN', 'zh-TW', 'en', 'de', 'fr', 'ja', 'ko', 'es'] as const
export type Language = typeof languages[number]
export const languageNames: Record<Language, string> = { 'zh-CN': '简体中文', 'zh-TW': '繁體中文', en: 'English', de: 'Deutsch', fr: 'Français', ja: '日本語', ko: '한국어', es: 'Español' }
export type Preferences = { theme: Theme; accent: Accent; language: Language; platform: PlatformLayout; layout: LayoutId }
const storageKey = 'keyboard-test-preferences-v2'

export function loadPreferences(): Preferences {
  const requestedLanguage = new URLSearchParams(window.location.search).get('lang')
  const language = languages.find(value => value === requestedLanguage)
  const browserLanguage = navigator.language.toLowerCase()
  const detected = browserLanguage.startsWith('zh') ? (/tw|hk|hant/.test(browserLanguage) ? 'zh-TW' : 'zh-CN') : languages.find(value => browserLanguage.startsWith(value)) ?? 'en'
  const defaults: Preferences = { theme: 'system', accent: 'blue', language: language ?? detected, platform: navigator.platform.startsWith('Mac') ? 'mac' : 'win', layout: 'us' }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (!saved || typeof saved !== 'object') return defaults
    return {
      theme: ['system', 'light', 'dark'].includes(saved.theme) ? saved.theme : defaults.theme,
      accent: accents.includes(saved.accent) ? saved.accent : defaults.accent,
      language: language ?? (languages.includes(saved.language) ? saved.language : defaults.language),
      platform: ['win', 'mac'].includes(saved.platform) ? saved.platform : defaults.platform,
      layout: layoutIds.includes(saved.layout) ? saved.layout : defaults.layout,
    }
  } catch { return defaults }
}

export function savePreferences(preferences: Preferences): boolean {
  try { localStorage.setItem(storageKey, JSON.stringify(preferences)); return true } catch { return false }
}
