'use client'

import { useEffect, useSyncExternalStore } from 'react'

const STORAGE_KEY = 'govea-dark-mode'

function getDarkSnapshot(): boolean {
  const stored = localStorage.getItem(STORAGE_KEY)
  return stored === 'dark' || (stored === null && window.matchMedia('(prefers-color-scheme: dark)').matches)
}

function subscribe(cb: () => void): () => void {
  window.addEventListener('storage', cb)
  return () => window.removeEventListener('storage', cb)
}

export function DarkModeToggle() {
  // useSyncExternalStore keeps dark state in sync with localStorage without
  // calling setState inside useEffect (which triggers the lint rule).
  // Server snapshot returns false so SSR output is stable.
  const dark = useSyncExternalStore(subscribe, getDarkSnapshot, () => false)

  // Apply the class to <html> whenever dark changes — pure DOM side effect
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])

  function toggle() {
    const next = !dark
    localStorage.setItem(STORAGE_KEY, next ? 'dark' : 'light')
    // Dispatch a storage event so useSyncExternalStore re-reads the snapshot
    window.dispatchEvent(new StorageEvent('storage', { key: STORAGE_KEY }))
  }

  return (
    <button
      onClick={toggle}
      className="rounded-md p-1.5 text-white/70 hover:bg-white/10 hover:text-white transition-colors"
      aria-label={dark ? 'Switch to light mode' : 'Switch to dark mode'}
    >
      {dark ? (
        // Sun icon
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364-6.364-.707.707M6.343 17.657l-.707.707m12.728 0-.707-.707M6.343 6.343l-.707-.707M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z" />
        </svg>
      ) : (
        // Moon icon
        <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
        </svg>
      )}
    </button>
  )
}
