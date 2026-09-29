import React, {createContext, useCallback, useContext, useEffect, useRef, useState} from 'react'
import {useI18n} from './I18nContext'

interface ToastContextType {
    showToast: (message: string) => void
}

const ToastContext = createContext<ToastContextType | undefined>(undefined)

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({children}) => {
    const {t} = useI18n()
    const [message, setMessage] = useState<string | null>(null)
    const timer = useRef<number | null>(null)

    const showToast = useCallback((msg: string) => {
        if (timer.current !== null) window.clearTimeout(timer.current)
        setMessage(msg)
        timer.current = window.setTimeout(() => {
            setMessage((current) => (current === msg ? null : current))
        }, 4000)
    }, [])

    useEffect(() => {
        const onError = (event: ErrorEvent) => {
            console.error('Errore JavaScript non gestito', event.error ?? event.message)
            showToast(t('page.errorUnexpected'))
        }
        const onRejection = (event: PromiseRejectionEvent) => {
            console.error('Promise rifiutata senza gestione', event.reason)
            showToast(t('page.errorUnexpected'))
        }
        window.addEventListener('error', onError)
        window.addEventListener('unhandledrejection', onRejection)
        return () => {
            window.removeEventListener('error', onError)
            window.removeEventListener('unhandledrejection', onRejection)
            if (timer.current !== null) window.clearTimeout(timer.current)
        }
    }, [showToast, t])

    return (
        <ToastContext.Provider value={{showToast}}>
            {children}
            {message && (
                <div className="toast-notification" role="status" aria-live="polite">
                    <span>{message}</span>
                </div>
            )}
        </ToastContext.Provider>
    )
}

export function useToast(): ToastContextType {
    const context = useContext(ToastContext)
    if (!context) {
        throw new Error('useToast deve essere utilizzato all’interno di un ToastProvider')
    }
    return context
}
