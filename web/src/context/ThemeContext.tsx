import {createContext, type ReactNode, useContext, useEffect, useMemo, useState} from 'react'

export type ThemeMode = 'system' | 'light' | 'dark'

interface ThemeContextValue {
    mode: ThemeMode
    setMode: (mode: ThemeMode) => void
    accent: string
    setAccent: (accent: string) => void
}

const ThemeContext = createContext<ThemeContextValue | null>(null)
const MODE_KEY = 'family-manager.theme-mode'
const ACCENT_KEY = 'family-manager.theme-accent'
const DEFAULT_ACCENT = '#536d9b'

function loadMode(): ThemeMode {
    const value = localStorage.getItem(MODE_KEY)
    return value === 'light' || value === 'dark' ? value : 'system'
}

function loadAccent(): string {
    const value = localStorage.getItem(ACCENT_KEY)
    return value && /^#[\da-f]{6}$/i.test(value) ? value : DEFAULT_ACCENT
}

export function ThemeProvider({children}: { children: ReactNode }) {
    const [mode, setMode] = useState<ThemeMode>(loadMode)
    const [accent, setAccent] = useState(loadAccent)

    useEffect(() => {
        const root = document.documentElement
        const media = window.matchMedia('(prefers-color-scheme: dark)')
        const apply = () => {
            root.dataset.theme = mode === 'system' ? (media.matches ? 'dark' : 'light') : mode
            root.style.setProperty('--accent-seed', accent)
            localStorage.setItem(MODE_KEY, mode)
            localStorage.setItem(ACCENT_KEY, accent)
        }
        apply()
        media.addEventListener('change', apply)
        return () => media.removeEventListener('change', apply)
    }, [mode, accent])

    const value = useMemo(() => ({mode, setMode, accent, setAccent}), [mode, accent])
    return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
}

export function useTheme() {
    const context = useContext(ThemeContext)
    if (!context) throw new Error('useTheme deve essere utilizzato all’interno di ThemeProvider')
    return context
}
