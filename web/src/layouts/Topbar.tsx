import {useState} from 'react'
import {LogOut, Search} from '../components/GoogleIcon'
import {useI18n} from '../context/I18nContext'
import {useAuth} from '../context/AuthContext'
import {useNavigate} from 'react-router-dom'

export function Topbar() {
    const {t} = useI18n()
    const {account, logout} = useAuth()
    const navigate = useNavigate()
    const [query, setQuery] = useState('')
    return <header className="app-topbar">
        <label className="topbar-search-container">
            <Search size={18} className="search-icon"/>
            <input
                type="search"
                className="topbar-search-input"
                aria-label={t('search.aria')}
                placeholder={t('search.placeholder')}
                value={query}
                onChange={(event) => setQuery(event.target.value)}
            />
        </label>
        <div className="topbar-account"><span>{account?.email}</span>
            <button type="button" aria-label={t('auth.logout')} title={t('auth.logout')} onClick={async () => {
                await logout();
                navigate('/login')
            }}><LogOut size={18}/></button>
        </div>
    </header>
}
