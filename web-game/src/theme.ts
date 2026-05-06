export const THEME_STORAGE_KEY = 'frappe-rpg-theme'

export type ThemeId = 'classic' | 'silk' | 'grimoire'

export const THEME_IDS: ThemeId[] = ['classic', 'silk', 'grimoire']

export function isThemeId(value: string | null | undefined): value is ThemeId {
  return value === 'classic' || value === 'silk' || value === 'grimoire'
}

/** Legacy id from earlier builds — migrate once to Silk. */
function migrateLegacyTheme(raw: string | null): ThemeId | null {
  if (raw === 'modern') return 'silk'
  return null
}

export function readStoredTheme(): ThemeId {
  if (typeof localStorage === 'undefined') return 'classic'
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY)
    const migrated = migrateLegacyTheme(raw)
    if (migrated !== null) {
      localStorage.setItem(THEME_STORAGE_KEY, migrated)
      return migrated
    }
    if (isThemeId(raw)) return raw
  } catch {
    /* ignore */
  }
  return 'classic'
}

export function writeStoredTheme(id: ThemeId): void {
  try {
    localStorage.setItem(THEME_STORAGE_KEY, id)
  } catch {
    /* ignore */
  }
}

export function themeShortLabel(id: ThemeId): string {
  if (id === 'classic') return 'Classic'
  if (id === 'silk') return 'Silk'
  return 'Grimoire'
}

/** Apply active theme to the document root (for `data-theme` CSS). */
export function applyThemeToDocument(themeId: ThemeId): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  if (themeId === 'classic') {
    root.removeAttribute('data-theme')
  } else {
    root.setAttribute('data-theme', themeId)
  }
}
