import { onMounted, ref } from 'vue'

const THEME_KEY = 'apg-theme'

export type ThemeName = 'light' | 'dark'

const currentTheme = ref<ThemeName>('light')

function applyTheme(theme: ThemeName): void {
  currentTheme.value = theme

  if (typeof document !== 'undefined') {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark')
    } else {
      document.documentElement.removeAttribute('data-theme')
    }
  }

  if (typeof window !== 'undefined') {
    window.localStorage.setItem(THEME_KEY, theme)
  }
}

function initTheme(): void {
  if (typeof window === 'undefined') {
    return
  }

  const stored = window.localStorage.getItem(THEME_KEY)
  if (stored === 'light' || stored === 'dark') {
    applyTheme(stored)
    return
  }

  const prefersDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
  applyTheme(prefersDark ? 'dark' : 'light')
}

export function useTheme() {
  onMounted(() => {
    initTheme()
  })

  function toggleTheme(): void {
    const nextTheme: ThemeName = currentTheme.value === 'light' ? 'dark' : 'light'
    applyTheme(nextTheme)
  }

  return {
    currentTheme,
    toggleTheme,
  }
}
