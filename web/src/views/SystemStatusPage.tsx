import {useI18n} from '../context/I18nContext'
import {Link} from 'react-router-dom'

export type SystemStatusKind = 'checking' | 'maintenance' | 'unavailable'

export function SystemStatusPage({kind, retrying = false, onRetry}: {
    kind: SystemStatusKind
    retrying?: boolean
    onRetry: () => void
}) {
    const {t} = useI18n()
    const checking = kind === 'checking'
    const maintenance = kind === 'maintenance'
    return <main className="system-status-page" aria-live="polite">
        <section className="system-status-card">
            <img className="system-status-logo" src="/logo.svg" alt="FamilyManager"/>
            <p className="section-eyebrow">{checking ? t('system.checkingLabel') : maintenance ? t('system.maintenanceLabel') : t('system.unavailableLabel')}</p>
            <h1>{checking ? t('system.checkingTitle') : maintenance ? t('system.maintenanceTitle') : t('system.unavailableTitle')}</h1>
            <p>{checking ? t('system.checkingText') : maintenance ? t('system.maintenanceText') : t('system.unavailableText')}</p>
            <button type="button" className="btn btn-primary" onClick={onRetry} disabled={retrying}>
                {retrying ? t('system.retrying') : t('common.retry')}
            </button>
            {!checking && <small>{t('system.retryHint')}</small>}
            <Link className="system-docs-link" to="/documentation">{t('system.documentation')}</Link>
        </section>
    </main>
}
