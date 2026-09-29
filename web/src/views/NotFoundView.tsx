import {Link} from 'react-router-dom'
import {useI18n} from '../context/I18nContext'

export function NotFoundView() {
    const {t} = useI18n()
    return <section className="data-state-card">
        <p className="section-eyebrow">404 · {t('page.error')}</p>
        <h1>{t('page.notFound')}</h1>
        <p>{t('page.notFoundText')}</p>
        <Link className="btn btn-primary" to="/">{t('common.backOverview')}</Link>
    </section>
}
