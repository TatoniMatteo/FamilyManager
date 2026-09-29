import {ArrowRight, Users2} from '../components/GoogleIcon'
import {Link} from 'react-router-dom'
import {useFamily} from '../context/FamilyContext'
import {useI18n} from '../context/I18nContext'

export function HomeDashboard() {
    const {persons, loading, error, reloadPersons} = useFamily()
    const {t} = useI18n()
    return <section className="home-dashboard-layout">
        <div className="dashboard-welcome-banner"><h1 className="welcome-title">{t('dashboard.welcome')}</h1><p
            className="welcome-subtitle">{t('dashboard.subtitle')}</p></div>
        {error ? <div className="data-state-card" role="alert"><h2>{t('dashboard.backendError')}</h2><p>{error}</p>
            <button className="btn btn-primary" onClick={() => void reloadPersons()}>{t('common.retry')}</button>
        </div> : loading ? <div className="data-state-card" role="status">{t('common.loading')}</div> : <>
            <div className="summary-cards-carousel">
                <article className="summary-card stat-blue">
                    <div className="summary-icon-wrap"><Users2 size={20}/></div>
                    <div className="summary-content"><span className="summary-label">{t('dashboard.people')}</span><span
                        className="summary-value">{persons.length}</span></div>
                </article>
            </div>
            <section className="widget-card family-overview-card">
                <div className="widget-header"><h2 className="widget-title">{t('dashboard.relatives')}</h2><Link
                    className="widget-link-btn" to="/family">{t('dashboard.openRegistry')} <ArrowRight
                    size={14}/></Link></div>
                {persons.length === 0 ? <p className="empty-home-state">{t('dashboard.empty')}</p> :
                    <ul className="home-person-list">{persons.slice(0, 8).map((person) => <li key={person.id}><span
                        className="person-initial"
                        aria-hidden="true">{person.displayName?.trim().charAt(0).toLocaleUpperCase() || '?'}</span><span>{person.displayName}</span><span
                        className="home-person-meta">{person.birthDate || t('dashboard.birthDateMissing')}</span>
                    </li>)}</ul>}
            </section>
        </>}
    </section>
}
