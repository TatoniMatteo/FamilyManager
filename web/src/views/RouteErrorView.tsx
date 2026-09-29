import {isRouteErrorResponse, Link, useRouteError} from 'react-router-dom'
import {useEffect, useState} from 'react'
import {useI18n} from '../context/I18nContext'

export function RouteErrorView() {
    const error = useRouteError()
    const {t} = useI18n()
    const [errorId] = useState(() => globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12))
    const status = isRouteErrorResponse(error) ? error.status : 500

    useEffect(() => {
        console.error('Errore di routing', {errorId, error})
    }, [error, errorId])

    return (
        <section className="data-state-card" role="alert">
            <p className="section-eyebrow">{t('page.error')}</p>
            <h1>{t('page.unavailable')}</h1>
            <p>{status === 404 ? t('page.notFoundText') : t('page.errorUnexpected')}</p>
            <small>{t('page.errorReference')}: {errorId}</small>
            <div className="system-status-actions"><Link className="btn btn-primary"
                                                         to="/">{t('common.backOverview')}</Link>
                <button type="button" className="btn btn-secondary"
                        onClick={() => window.location.reload()}>{t('common.retry')}</button>
            </div>
        </section>
    )
}
