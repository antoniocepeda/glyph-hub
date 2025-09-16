"use client"
import { useEffect } from 'react'

export function ThemeClient() {
  useEffect(() => {
    try {
      const root = document.documentElement
      const stored = localStorage.getItem('theme')
      const prefersDark =
        typeof window !== 'undefined' &&
        window.matchMedia &&
        window.matchMedia('(prefers-color-scheme: dark)').matches

      const isDark = stored === 'dark' || ((!stored || stored === 'system') && prefersDark)
      root.classList.toggle('dark', !!isDark)
    } catch {
      // ignore theme init errors
    }
  }, [])

  return null
}



