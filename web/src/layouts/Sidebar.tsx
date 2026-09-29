import {NavLink} from 'react-router-dom'
import {
    Bike,
    Briefcase,
    Cake,
    Calendar,
    CalendarDays,
    FileText,
    Heart,
    Home,
    Palmtree,
    Settings,
    ShoppingCart,
    Users2,
    Utensils
} from '../components/GoogleIcon'
import {useFamily} from '../context/FamilyContext'
import {useI18n} from '../context/I18nContext'

const navigation = [
    {to: '/', label: 'nav.overview', icon: Home, end: true},
    {to: '/family', label: 'nav.family', icon: Users2},
    {to: '/calendar', label: 'nav.calendar', icon: Calendar},
    {to: '/meals', label: 'nav.meals', icon: Utensils},
    {to: '/groceries', label: 'nav.groceries', icon: ShoppingCart},
    {to: '/health', label: 'nav.health', icon: Heart},
    {to: '/activities', label: 'nav.activities', icon: Bike},
    {to: '/birthdays', label: 'nav.birthdays', icon: Cake},
    {to: '/events', label: 'nav.events', icon: CalendarDays},
    {to: '/holidays', label: 'nav.holidays', icon: Palmtree},
    {to: '/work', label: 'nav.work', icon: Briefcase},
    {to: '/notes', label: 'nav.notes', icon: FileText},
    {to: '/documentation', label: 'nav.docs', icon: FileText},
    {to: '/settings', label: 'nav.settings', icon: Settings},
]

export function Sidebar() {
    const {persons, loading, error} = useFamily()
    const {t} = useI18n()
    return <aside className="app-sidebar">
        <NavLink to="/" className="sidebar-brand">
            <div className="brand-icon"><img src="/logo.svg" alt=""/></div>
            <div className="brand-text"><h1 className="brand-title">Family Manager</h1><p
                className="brand-subtitle">{t('app.subtitle')}</p></div>
        </NavLink>
        <nav className="sidebar-nav" aria-label={t('nav.mainAria')}>
            {navigation.map(({to, label, icon: Icon, end}) => <NavLink key={to} to={to} end={end}
                                                                       className={({isActive}) => `sidebar-nav-item ${isActive ? 'active' : ''} ${to === '/settings' ? 'settings-nav-item' : ''}`}>
                <Icon size={18} className="nav-item-icon"/><span className="nav-item-label">{t(label)}</span>
            </NavLink>)}
        </nav>
        <div className="sidebar-footer">
            <NavLink to="/family" className="family-badge-btn">
                <span className="family-count-badge" aria-hidden="true">{loading || error ? '—' : persons.length}</span>
                <span className="family-badge-text">{t('app.peopleCount')}</span>
            </NavLink>
        </div>
    </aside>
}
