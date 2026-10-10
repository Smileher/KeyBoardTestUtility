export const accents = ['mint', 'blue', 'violet', 'amber', 'cyan', 'rose', 'coral', 'graphite'] as const
export type Accent = typeof accents[number]
export type Theme = 'system' | 'light' | 'dark'
export type Language = 'zh-CN' | 'en'
export type Preferences = { theme: Theme; accent: Accent; language: Language }
const storageKey = 'keyboard-test-preferences-v2'

export function loadPreferences(): Preferences {
  const requestedLanguage = new URLSearchParams(window.location.search).get('lang')
  const language = requestedLanguage === 'en' || requestedLanguage === 'zh-CN' ? requestedLanguage : undefined
  const defaults: Preferences = { theme: 'system', accent: 'blue', language: language ?? (navigator.language.toLowerCase().startsWith('zh') ? 'zh-CN' : 'en') }
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey) ?? 'null')
    if (!saved || typeof saved !== 'object') return defaults
    return {
      theme: ['system', 'light', 'dark'].includes(saved.theme) ? saved.theme : defaults.theme,
      accent: accents.includes(saved.accent) ? saved.accent : defaults.accent,
      language: language ?? (['zh-CN', 'en'].includes(saved.language) ? saved.language : defaults.language),
    }
  } catch { return defaults }
}

export function savePreferences(preferences: Preferences): boolean {
  try { localStorage.setItem(storageKey, JSON.stringify(preferences)); return true } catch { return false }
}
