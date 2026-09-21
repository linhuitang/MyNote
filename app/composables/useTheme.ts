export type ThemePreference = 'system' | 'light' | 'dark'
export type ResolvedTheme = Exclude<ThemePreference, 'system'>

const STORAGE_KEY = 'mynote-theme'

export function useTheme() {
  const preference = useState<ThemePreference>('theme-preference', () => 'system')
  const systemDark = useState<boolean>('theme-system-dark', () => false)
  const resolvedTheme = computed<ResolvedTheme>(() => (
    preference.value === 'system'
      ? (systemDark.value ? 'dark' : 'light')
      : preference.value
  ))

  function applyTheme(): void {
    if (!import.meta.client) return
    document.documentElement.dataset.theme = resolvedTheme.value
    document.documentElement.style.colorScheme = resolvedTheme.value
  }

  function setTheme(value: ThemePreference): void {
    preference.value = value
    if (import.meta.client) localStorage.setItem(STORAGE_KEY, value)
    applyTheme()
  }

  function initialiseTheme(): void {
    if (!import.meta.client) return

    const savedPreference = localStorage.getItem(STORAGE_KEY)
    if (savedPreference === 'system' || savedPreference === 'light' || savedPreference === 'dark') {
      preference.value = savedPreference
    }

    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
    systemDark.value = mediaQuery.matches
    applyTheme()

    mediaQuery.addEventListener('change', (event) => {
      systemDark.value = event.matches
      if (preference.value === 'system') applyTheme()
    })
  }

  return { preference, resolvedTheme, setTheme, initialiseTheme }
}
