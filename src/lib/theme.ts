import { createSignal, createEffect } from 'solid-js'

type Theme = 'light' | 'dark' | 'system'

const stored = localStorage.getItem('theme') as Theme | null
const [theme, setTheme] = createSignal<Theme>(stored ?? 'system')

// Set while a sheet with its own background is open (src/hooks/use-sheet-background.ts): the
// background then decides light or dark, in place of the player's theme, which is kept for every
// other page. Not stored, since it belongs to the open sheet.
const [sheetTone, setSheetTone] = createSignal<'light' | 'dark' | null>(null)

createEffect(() => {
  const t = theme()
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const tone = sheetTone()
  const isDark = tone != null ? tone === 'dark' : t === 'dark' || (t === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
  localStorage.setItem('theme', t)
})

export { theme, setTheme, sheetTone, setSheetTone, type Theme }
