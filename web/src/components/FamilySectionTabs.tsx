import {NavLink, useLocation} from 'react-router-dom'
import {Home, Users2} from './GoogleIcon'
import {useI18n} from '../context/I18nContext'

export function FamilySectionTabs() {
    const {pathname} = useLocation()
    const {t} = useI18n()
    const householdsActive = pathname === '/family/households'
    const peopleActive = pathname === '/family' || (pathname.startsWith('/family/') && !householdsActive)
    return <nav className="family-section-tabs" aria-label={t('family.title')}>
        <NavLink to="/family" className={`family-section-tab ${peopleActive ? 'active' : ''}`}><Users2
            size={17}/>{t('family.personsTab')}</NavLink>
        <NavLink to="/family/households" className={`family-section-tab ${householdsActive ? 'active' : ''}`}><Home
            size={17}/>{t('family.householdsTab')}</NavLink>
    </nav>
}
