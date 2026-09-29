import {createContext, type ReactNode, useCallback, useContext, useEffect, useMemo, useState} from 'react'
import {api, type AuthAccount} from '../api/client'

interface AuthValue {
    account: AuthAccount | null
    loading: boolean
    login: (email: string, password: string) => Promise<void>
    logout: () => Promise<void>
    refresh: () => Promise<void>
}

const AuthContext = createContext<AuthValue | null>(null)

export function AuthProvider({children}: { children: ReactNode }) {
    const [account, setAccount] = useState<AuthAccount | null>(null)
    const [loading, setLoading] = useState(true)

    const refresh = useCallback(async () => {
        try {
            setAccount(await api.auth.me())
        } catch {
            setAccount(null)
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void refresh()
    }, [refresh])

    const value = useMemo<AuthValue>(() => ({
        account,
        loading,
        login: async (email, password) => setAccount(await api.auth.login(email, password)),
        logout: async () => {
            await api.auth.logout();
            setAccount(null)
        },
        refresh,
    }), [account, loading, refresh])

    return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
    const value = useContext(AuthContext)
    if (!value) throw new Error('useAuth deve essere utilizzato dentro AuthProvider')
    return value
}
