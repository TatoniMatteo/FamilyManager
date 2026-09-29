import {Link, useLocation} from 'react-router-dom'
import {useI18n} from '../context/I18nContext'

const sectionTitles: Record<string, string> = {
    calendar: 'nav.calendar', meals: 'nav.meals', groceries: 'nav.groceries', health: 'nav.health',
    activities: 'nav.activities', birthdays: 'nav.birthdays', events: 'nav.events', holidays: 'nav.holidays',
    work: 'nav.work', notes: 'nav.notes',
}

export function PlaceholderView() {
    const {pathname} = useLocation()
    const {t} = useI18n()
    const title = t(sectionTitles[pathname.split('/')[1]] ?? 'page.notFound')
    return <section className="data-state-card">
        <p className="section-eyebrow">{t('page.unavailableModule')}</p>
        <h1>{title}</h1>
        <p>{t('page.noBackend')}</p>
        <Link className="btn btn-primary" to="/family">{t('page.goFamily')}</Link>
    </section>
}
