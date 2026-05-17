import { createSignal, createEffect } from 'solid-js'

type Theme = 'light' | 'dark' | 'system'

const stored = localStorage.getItem('theme') as Theme | null
const [theme, setTheme] = createSignal<Theme>(stored ?? 'system')

createEffect(() => {
  const t = theme()
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
  const isDark = t === 'dark' || (t === 'system' && prefersDark)
  document.documentElement.classList.toggle('dark', isDark)
  localStorage.setItem('theme', t)
})

export { theme, setTheme, type Theme }
