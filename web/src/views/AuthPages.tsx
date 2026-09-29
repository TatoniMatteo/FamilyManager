import {type FormEvent, type ReactNode, useEffect, useState} from 'react'
import {Link, Navigate, Outlet, useNavigate, useSearchParams} from 'react-router-dom'
import {api} from '../api/client'
import {useAuth} from '../context/AuthContext'
import {useI18n} from '../context/I18nContext'
import {FileText, GoogleBrand} from '../components/GoogleIcon'
import {LanguageSelect} from '../components/LanguageSelect'

export function AuthGate() {
    const {t} = useI18n()
    const {account, loading} = useAuth()
    if (loading) return <AuthShell><p>{t('common.loading')}</p></AuthShell>
    if (!account) return <Navigate to="/login" replace/>
    if (account.passwordSetupRequired) return <Navigate to="/set-password" replace/>
    if (account.approvalPending) return <Navigate to="/pending-approval" replace/>
    if (!account.profileDetailsComplete) return <Navigate to="/initial-setup" replace/>
    return <Outlet/>
}

export function LoginPage() {
    const {t} = useI18n()
    const [searchParams] = useSearchParams()
    const {account, login} = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [googleEnabled, setGoogleEnabled] = useState(false)
    const googleMessage = searchParams.get('google')
    const googleError = searchParams.get('error')
    useEffect(() => {
        void api.auth.googleStatus().then(result => setGoogleEnabled(result.enabled)).catch(() => setGoogleEnabled(false))
    }, [])
    if (account) return <Navigate to="/" replace/>

    async function submit(event: FormEvent) {
        event.preventDefault();
        setError('');
        setBusy(true)
        try {
            await login(email, password);
            navigate('/')
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('auth.loginError'))
        } finally {
            setBusy(false)
        }
    }

    return <AuthShell showHeaderActions>
        <h1>{t('auth.loginTitle')}</h1>
        <p className="auth-intro">{t('auth.tagline')}</p>
        {googleMessage && <p className="auth-notice"
                             role="status">{t(googleMessage === 'password-sent' ? 'auth.googlePasswordSent' : 'auth.pendingApproval')}</p>}
        {googleError && <p className="auth-error" role="alert">{t('auth.googleError')}</p>}
        <form className="auth-form" onSubmit={submit}>
            <label>{t('auth.email')}<input type="email" autoComplete="email" required value={email}
                                           onChange={event => setEmail(event.target.value)}/></label>
            <label>{t('auth.password')}<input type="password" autoComplete="current-password" required value={password}
                                              onChange={event => setPassword(event.target.value)}/></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-primary" disabled={busy}>{busy ? t('auth.loggingIn') : t('auth.login')}</button>
        </form>
        {googleEnabled &&
            <button className="auth-google" onClick={() => window.location.assign('/oauth2/authorization/google')}>
                <GoogleBrand/>{t('auth.continueGoogle')}</button>}
        <p className="auth-footnote"><Link to="/password-reset-request">{t('auth.forgotPassword')}</Link></p>
        <p className="auth-footnote">{t('auth.noAccount')} <Link to="/register">{t('auth.register')}</Link></p>
    </AuthShell>
}

export function RegistrationPage() {
    const {t} = useI18n()
    const [searchParams] = useSearchParams()
    const invitationToken = searchParams.get('invitation')
    const [email, setEmail] = useState('')
    const [password, setPassword] = useState('')
    const [confirmation, setConfirmation] = useState('')
    const [invitationType, setInvitationType] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const [googleEnabled, setGoogleEnabled] = useState(false)
    const [inviteError, setInviteError] = useState('')

    useEffect(() => {
        void api.auth.googleStatus().then(result => setGoogleEnabled(result.enabled)).catch(() => setGoogleEnabled(false))
        if (invitationToken) {
            void api.auth.invitation(invitationToken).then(invitation => {
                setEmail(invitation.email);
                setInvitationType(invitation.type)
            })
                .catch(() => setInviteError(t('auth.invalidInvitation')))
        }
    }, [invitationToken, t])

    async function submit(event: FormEvent) {
        event.preventDefault();
        setError('');
        setMessage('')
        if (password !== confirmation) {
            setError(t('auth.passwordMismatch'));
            return
        }
        setBusy(true)
        try {
            await api.auth.register(email, password, invitationToken ?? undefined)
            setMessage(invitationType === 'PROFILE_EMAIL' ? t('auth.registrationInvitedAuto')
                : invitationType === 'PROFILE' ? t('auth.registrationInvitedProfile')
                    : invitationType === 'SIMPLE' ? t('auth.registrationInvitedSimple') : t('auth.registrationSuccess'))
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('auth.registrationError'))
        } finally {
            setBusy(false)
        }
    }

    return <AuthShell>
        <h1>{t('auth.createAccount')}</h1>
        <p className="auth-intro">{t('auth.firstAdminIntro')}</p>
        {inviteError && <p className="auth-error" role="alert">{inviteError}</p>}
        {message ?
            <div className="auth-success" role="status">{message}<Link to="/login">{t('auth.goToLogin')}</Link></div> :
            <form className="auth-form" onSubmit={submit}>
                <label>{t('auth.email')}<input type="email" autoComplete="email" required
                                               readOnly={Boolean(invitationToken)} value={email}
                                               onChange={event => setEmail(event.target.value)}/></label>
                <label>{t('auth.password')}<input type="password" autoComplete="new-password" minLength={12} required
                                                  value={password} onChange={event => setPassword(event.target.value)}/><small>{t('auth.passwordLength')}</small></label>
                <label>{t('auth.repeatPassword')}<input type="password" autoComplete="new-password" minLength={12}
                                                        required value={confirmation}
                                                        onChange={event => setConfirmation(event.target.value)}/></label>
                {error && <p className="auth-error" role="alert">{error}</p>}
                <button className="auth-primary"
                        disabled={busy}>{busy ? t('auth.creating') : t('auth.register')}</button>
            </form>}
        {!message && googleEnabled && <button className="auth-google" onClick={async () => {
            if (!invitationToken) {
                window.location.assign('/oauth2/authorization/google');
                return
            }
            try {
                const result = await api.auth.prepareGoogleInvitation(invitationToken);
                window.location.assign(result.authorizationUrl)
            } catch {
                setInviteError(t('auth.invalidInvitation'))
            }
        }}><GoogleBrand/>{t('auth.continueGoogle')}</button>}
        <p className="auth-footnote">{t('auth.haveAccount')} <Link to="/login">{t('auth.login')}</Link></p>
    </AuthShell>
}

export function RequestPasswordResetPage() {
    const {t} = useI18n()
    const [email, setEmail] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)

    async function submit(event: FormEvent) {
        event.preventDefault();
        setError('');
        setBusy(true)
        try {
            await api.auth.requestPasswordReset(email);
            setMessage(t('auth.resetRequested'))
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('auth.resetError'))
        } finally {
            setBusy(false)
        }
    }

    return <AuthShell><h1>{t('auth.forgotPassword')}</h1>{message ? <div className="auth-success">{message}</div> :
        <form className="auth-form" onSubmit={submit}>
            <label>{t('auth.email')}<input type="email" required autoComplete="email" value={email}
                                           onChange={event => setEmail(event.target.value)}/></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-primary"
                    disabled={busy}>{busy ? t('auth.sending') : t('auth.sendResetLink')}</button>
        </form>}<p className="auth-footnote"><Link to="/login">{t('auth.goToLogin')}</Link></p></AuthShell>
}

export function ChangePasswordPage({setup = false}: { setup?: boolean }) {
    const {t} = useI18n()
    const {account, loading, refresh} = useAuth()
    const [params] = useSearchParams()
    const navigate = useNavigate()
    const [password, setPassword] = useState('')
    const [confirmation, setConfirmation] = useState('')
    const [message, setMessage] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    const token = params.get('token') ?? ''
    if (setup && !token && !loading && !account?.passwordSetupRequired) {
        return <Navigate to={account ? '/' : '/login'} replace/>
    }

    async function submit(event: FormEvent) {
        event.preventDefault();
        setError('')
        if (password !== confirmation) {
            setError(t('auth.passwordMismatch'));
            return
        }
        setBusy(true)
        try {
            if (setup) {
                if (token) {
                    const result = await api.auth.setupPassword(token, password)
                    setMessage(result.status === 'ACTIVE' ? t('auth.passwordSetupSuccess') : t('auth.pendingApproval'))
                } else {
                    const result = await api.auth.setupGooglePassword(password)
                    await refresh()
                    navigate(result.status === 'ACTIVE' ? '/' : '/pending-approval', {replace: true})
                }
            } else {
                await api.auth.resetPassword(token, password)
                setMessage(t('auth.passwordResetSuccess'))
            }
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('auth.resetError'))
        } finally {
            setBusy(false)
        }
    }

    return <AuthShell><h1>{setup ? t('auth.setPassword') : t('auth.resetPassword')}</h1>{setup && !token &&
        <p className="auth-intro">{t('auth.googlePasswordSetupIntro')}</p>}{message ?
        <div className="auth-success">{message}<Link to="/login">{t('auth.goToLogin')}</Link></div> :
        <form className="auth-form" onSubmit={submit}>
            <label>{t('auth.password')}<input type="password" minLength={12} required autoComplete="new-password"
                                              value={password}
                                              onChange={event => setPassword(event.target.value)}/>{setup &&
                <small>{t('auth.passwordLength')}</small>}</label>
            <label>{t('auth.repeatPassword')}<input type="password" minLength={12} required autoComplete="new-password"
                                                    value={confirmation}
                                                    onChange={event => setConfirmation(event.target.value)}/></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-primary"
                    disabled={busy || (setup && !token && (loading || !account?.passwordSetupRequired)) || (!setup && !token)}>{busy ? t('auth.saving') : t('auth.savePassword')}</button>
        </form>}</AuthShell>
}

export function VerifyEmailPage() {
    const {t} = useI18n()
    const [params] = useSearchParams()
    const token = params.get('token')
    const navigate = useNavigate()
    const [message, setMessage] = useState(t('auth.verifying'))
    const [success, setSuccess] = useState(false)
    useEffect(() => {
        if (!token) {
            setMessage(t('auth.invalidToken'));
            return
        }
        api.auth.verifyEmail(token).then(result => {
            setSuccess(true)
            setMessage(result.initialAdmin === 'true' ? t('auth.firstAdminVerified')
                : result.status === 'ACTIVE' ? t('auth.invitationActivated') : t('auth.pendingApproval'))
        }).catch(cause => setMessage(cause instanceof Error ? cause.message : t('auth.invalidToken')))
    }, [token])
    return <AuthShell><h1>{t('auth.verifyTitle')}</h1>
        <div className={success ? 'auth-success' : 'auth-notice'}>{message}</div>
        {success && <button className="auth-primary" onClick={() => navigate('/login')}>{t('auth.goToLogin')}</button>}
    </AuthShell>
}

export function InitialSetupPage() {
    const {t} = useI18n()
    const {account, loading, refresh} = useAuth()
    const navigate = useNavigate()
    const [firstName, setFirstName] = useState('')
    const [lastName, setLastName] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [gender, setGender] = useState('')
    const [error, setError] = useState('')
    const [busy, setBusy] = useState(false)
    useEffect(() => {
        if (!account) return
        setFirstName((value) => value || account.suggestedFirstName || '')
        setLastName((value) => value || account.suggestedLastName || '')
        setBirthDate((value) => value || account.suggestedBirthDate || '')
        setGender((value) => value || account.suggestedGender || '')
    }, [account])
    if (loading) return <AuthShell><p>{t('common.loading')}</p></AuthShell>
    if (!account) return <Navigate to="/login" replace/>
    if (account.profileDetailsComplete) return <Navigate to="/" replace/>

    async function submit(event: FormEvent) {
        event.preventDefault();
        setError('');
        setBusy(true)
        try {
            await api.auth.createProfile({firstName, lastName, birthDate, gender});
            await refresh();
            navigate('/')
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : t('auth.profileError'))
        } finally {
            setBusy(false)
        }
    }

    return <AuthShell>
        <p className="auth-eyebrow">{t('auth.setupStep')}</p>
        <h1>{t('auth.setupTitle')}</h1>
        <p className="auth-intro">{t('auth.setupIntro')}</p>
        <form className="auth-form" onSubmit={submit}>
            <label>{t('profile.firstName')}<input autoComplete="given-name" required maxLength={100} value={firstName}
                                                  onChange={event => setFirstName(event.target.value)}/></label>
            <label>{t('profile.lastName')}<input autoComplete="family-name" required maxLength={100} value={lastName}
                                                 onChange={event => setLastName(event.target.value)}/></label>
            <label>{t('person.birthDate')}<input type="date" autoComplete="bday" required
                                                 max={new Date().toISOString().slice(0, 10)} value={birthDate}
                                                 onChange={event => setBirthDate(event.target.value)}/></label>
            <label>{t('profile.sex')}<select required value={gender} onChange={event => setGender(event.target.value)}>
                <option value="">{t('profile.chooseGender')}</option>
                <option value="MALE">{t('person.male')}</option>
                <option value="FEMALE">{t('person.female')}</option>
                <option value="OTHER">{t('person.other')}</option>
            </select></label>
            {error && <p className="auth-error" role="alert">{error}</p>}
            <button className="auth-primary"
                    disabled={busy}>{busy ? t('auth.saving') : t('auth.createProfile')}</button>
        </form>
    </AuthShell>
}

export function PendingApprovalPage() {
    const {t} = useI18n()
    const {account, loading, refresh, logout} = useAuth()
    useEffect(() => {
        const interval = window.setInterval(() => {
            void refresh()
        }, 5000)
        return () => window.clearInterval(interval)
    }, [refresh])
    if (loading) return <AuthShell><p>{t('common.loading')}</p></AuthShell>
    if (!account) return <Navigate to="/login" replace/>
    if (!account.approvalPending) return <Navigate to={account.profileDetailsComplete ? '/' : '/initial-setup'}
                                                   replace/>
    return <AuthShell showHeaderActions>
        <h1>{t('auth.pendingApprovalTitle')}</h1>
        <p className="auth-intro" role="status">{t('auth.pendingApproval')}</p>
        <button className="auth-primary" onClick={() => void logout()}>{t('auth.logout')}</button>
    </AuthShell>
}

function AuthShell({children, showHeaderActions = false}: { children: ReactNode; showHeaderActions?: boolean }) {
    const {t} = useI18n()
    return <main className={`auth-page${showHeaderActions ? ' auth-page-with-actions' : ''}`}>
        {showHeaderActions && <div className="auth-page-actions">
            <LanguageSelect className="auth-language-select"/>
            <Link
                className="auth-docs-link"
                to="/documentation"
                aria-label={t('docs.documentation')}
                data-tooltip={t('docs.documentation')}
            >
                <FileText size={20}/>
            </Link>
        </div>}
        <section className="auth-card">
            <div className="auth-header">
                <div className="auth-brand"><span className="auth-brand-logo"><img src="/logo.svg"
                                                                                   alt=""/></span><strong>FamilyManager</strong>
                </div>
            </div>
            {children}
        </section>
    </main>
}
