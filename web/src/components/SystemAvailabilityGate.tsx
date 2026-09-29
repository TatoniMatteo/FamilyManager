import {type ReactNode, useCallback, useEffect, useRef, useState} from 'react'
import {type SystemStatusKind, SystemStatusPage} from '../views/SystemStatusPage'

type Availability = SystemStatusKind | 'operational'

export function SystemAvailabilityGate({children}: { children: ReactNode }) {
    const [availability, setAvailability] = useState<Availability>('checking')
    const [retrying, setRetrying] = useState(false)
    const requestSequence = useRef(0)

    const refresh = useCallback(async () => {
        const sequence = ++requestSequence.current
        setRetrying(true)
        try {
            const response = await fetch('/api/system/status', {
                cache: 'no-store',
                headers: {Accept: 'application/json'},
                signal: AbortSignal.timeout(5_000),
            })
            if (!response.ok) {
                if (sequence === requestSequence.current) setAvailability('unavailable')
                return
            }
            const result: unknown = await response.json()
            const status = result && typeof result === 'object' && 'status' in result
                ? (result as { status: unknown }).status
                : null
            if (sequence === requestSequence.current) setAvailability(status === 'MAINTENANCE' ? 'maintenance' : status === 'OPERATIONAL' ? 'operational' : 'unavailable')
        } catch {
            if (sequence === requestSequence.current) setAvailability('unavailable')
        } finally {
            if (sequence === requestSequence.current) setRetrying(false)
        }
    }, [])

    useEffect(() => {
        void refresh()
        const timer = window.setInterval(() => void refresh(), 20_000)
        const onServiceUnavailable = () => {
            requestSequence.current += 1
            setAvailability('unavailable')
            setRetrying(false)
        }
        const onOnline = () => void refresh()
        window.addEventListener('familymanager:service-unavailable', onServiceUnavailable)
        window.addEventListener('online', onOnline)
        return () => {
            window.clearInterval(timer)
            window.removeEventListener('familymanager:service-unavailable', onServiceUnavailable)
            window.removeEventListener('online', onOnline)
        }
    }, [refresh])

    if (availability !== 'operational') {
        const kind = availability === 'maintenance' ? 'maintenance' : availability === 'unavailable' ? 'unavailable' : 'checking'
        return <SystemStatusPage kind={kind} retrying={retrying} onRetry={() => void refresh()}/>
    }
    return children
}
