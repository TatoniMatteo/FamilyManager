import {Languages, Link2, MailPlus, Palette, Sun, TriangleAlert, UserRoundCog} from '../components/GoogleIcon'
import {type FormEvent, useEffect, useState} from 'react'
import {useNavigate, useSearchParams} from 'react-router-dom'
import {api, type InvitationSummary, type PendingAccount} from '../api/client'
import {useAuth} from '../context/AuthContext'
import {useFamily} from '../context/FamilyContext'
import {useI18n} from '../context/I18nContext'
import {type ThemeMode, useTheme} from '../context/ThemeContext'
import {LanguageSelect} from '../components/LanguageSelect'

export function SettingsPage() {
    const {t} = useI18n()
    const {mode, setMode, accent, setAccent} = useTheme()
    const {account, refresh} = useAuth()
    const navigate = useNavigate()
    const [searchParams] = useSearchParams()
    const {persons, households, reloadPersons, deletePerson, deleteHousehold} = useFamily()
    const [pendingAccounts, setPendingAccounts] = useState<PendingAccount[]>([])
    const [availableProfiles, setAvailableProfiles] = useState<Array<{ id: string; displayName: string }>>([])
    const [assignments, setAssignments] = useState<Record<string, string>>({})
    const [newNames, setNewNames] = useState<Record<string, string>>({})
    const [approvalError, setApprovalError] = useState('')
    const [invitations, setInvitations] = useState<InvitationSummary[]>([])
    const [inviteEmail, setInviteEmail] = useState('')
    const [inviteType, setInviteType] = useState('SIMPLE')
    const [invitePersonId, setInvitePersonId] = useState('')
    const [inviteHours, setInviteHours] = useState(168)
    const [createdInviteUrl, setCreatedInviteUrl] = useState('')
    const [googleEnabled, setGoogleEnabled] = useState(false)
    const [googleBusy, setGoogleBusy] = useState(false)
    const [googleError, setGoogleError] = useState('')
    const [activeAccounts, setActiveAccounts] = useState<Array<{ id: string; email: string; role: string }>>([])
    const [replacementAdminId, setReplacementAdminId] = useState('')
    const [dangerError, setDangerError] = useState('')

    const reloadPending = async () => {
        try {
            const [pending, profiles, nextInvitations, active] = await Promise.all([api.admin.pendingAccounts(), api.admin.availableProfiles(), api.admin.invitations(), api.admin.activeAccounts()])
            setPendingAccounts(pending)
            setAvailableProfiles(profiles)
            setInvitations(nextInvitations)
            setActiveAccounts(active)
        } catch (cause) {
            setApprovalError(cause instanceof Error ? cause.message : t('settings.accountsLoadError'))
        }
    }

    useEffect(() => {
        if (account?.role === 'ADMIN') void reloadPending()
    }, [account?.role])
    useEffect(() => {
        void api.auth.googleStatus().then(result => setGoogleEnabled(result.enabled)).catch(() => setGoogleEnabled(false))
    }, [])

    const approve = async (pending: PendingAccount) => {
        setApprovalError('')
        const selected = assignments[pending.id] ?? 'create'
        const name = newNames[pending.id]?.trim()
        if (!pending.invitedProfileName && selected === 'create' && !name) {
            setApprovalError(t('settings.profileNameRequired'));
            return
        }
        try {
            await api.admin.approveAccount(pending.id, pending.invitedProfileName ? {} : selected === 'create' ? {displayName: name} : {personId: selected})
            await Promise.all([reloadPending(), reloadPersons()])
        } catch (cause) {
            setApprovalError(cause instanceof Error ? cause.message : t('settings.approvalError'))
        }
    }

    const createInvitation = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        setApprovalError('');
        setCreatedInviteUrl('')
        try {
            const created = await api.admin.createInvitation({
                email: inviteEmail, type: inviteType,
                personId: inviteType === 'SIMPLE' ? undefined : invitePersonId, expiresInHours: inviteHours
            })
            setCreatedInviteUrl(created.url)
            setInviteEmail('')
            await reloadPending()
        } catch (cause) {
            setApprovalError(cause instanceof Error ? cause.message : t('settings.inviteCreateError'))
        }
    }

    return <section className="settings-page">
        <header className="page-header-row">
            <div className="page-title-group">
                <div className="page-title-icon-badge"><Palette size={23}/></div>
                <div><h1 className="page-title">{t('settings.title')}</h1><p
                    className="page-subtitle">{t('settings.subtitle')}</p></div>
            </div>
        </header>
        <div className="settings-grid">
            <section className="settings-card">
                <div className="settings-card-heading"><span className="settings-card-icon"><Sun size={19}/></span>
                    <div><h2>{t('settings.appearance')}</h2><p>{t('settings.themeHelp')}</p></div>
                </div>
                <label className="settings-field"><span>{t('settings.theme')}</span><select value={mode}
                                                                                            onChange={(event) => setMode(event.target.value as ThemeMode)}
                                                                                            aria-label={t('settings.theme')}>
                    <option value="system">{t('settings.system')}</option>
                    <option value="light">{t('settings.light')}</option>
                    <option value="dark">{t('settings.dark')}</option>
                </select></label>
                <label className="settings-field settings-color-field"><span>{t('settings.dynamicColor')}</span><span
                    className="settings-field-description">{t('settings.dynamicColorHelp')}</span><input type="color"
                                                                                                         aria-label={t('settings.dynamicColor')}
                                                                                                         value={accent}
                                                                                                         onChange={(event) => setAccent(event.target.value)}/></label>
            </section>
            {googleEnabled && <section className="settings-card">
                <div className="settings-card-heading"><span className="settings-card-icon"><Link2 size={19}/></span>
                    <div><h2>{t('settings.googleAccount')}</h2><p>{t('settings.googleAccountHelp')}</p></div>
                </div>
                {searchParams.get('google') === 'linked' &&
                    <p className="auth-success" role="status">{t('settings.googleLinked')}</p>}
                {searchParams.get('google') === 'link-error' &&
                    <p className="auth-error" role="alert">{t('settings.googleLinkError')}</p>}
                {googleError && <p className="auth-error" role="alert">{googleError}</p>}
                {account?.googleConnected ? <p className="google-linked-state">{t('settings.googleConnected')}</p> :
                    <button className="auth-google" disabled={googleBusy} onClick={async () => {
                        setGoogleBusy(true);
                        setGoogleError('')
                        try {
                            const result = await api.auth.beginGoogleLink();
                            window.location.assign(result.authorizationUrl)
                        } catch (cause) {
                            setGoogleError(cause instanceof Error ? cause.message : t('settings.googleLinkError'));
                            setGoogleBusy(false)
                        }
                    }}>{googleBusy ? t('settings.googleRedirecting') : t('settings.connectGoogle')}</button>}
            </section>}
            <section className="settings-card">
                <div className="settings-card-heading"><span className="settings-card-icon"><Languages
                    size={19}/></span>
                    <div><h2>{t('settings.language')}</h2><p>{t('settings.languageHelp')}</p></div>
                </div>
                <LanguageSelect className="settings-language-select"/>
            </section>
            {account?.role === 'ADMIN' && <section className="settings-card settings-admin-card">
                <div className="settings-card-heading"><span className="settings-card-icon"><UserRoundCog
                    size={19}/></span>
                    <div><h2>{t('settings.accountRequests')}</h2><p>{t('settings.accountRequestsHelp')}</p></div>
                </div>
                {approvalError && <p className="auth-error" role="alert">{approvalError}</p>}
                {pendingAccounts.length === 0 ? <p className="settings-empty">{t('settings.noAccountRequests')}</p> :
                    <div className="account-request-list">
                        {pendingAccounts.map(pending => <article className="account-request" key={pending.id}>
                            <div className="account-request-heading">
                                <strong>{pending.email}</strong><span>{new Date(pending.registeredAt).toLocaleDateString()}</span>
                            </div>
                            {pending.invitedProfileName ?
                                <p className="invite-profile-notice">{t('settings.inviteAutoProfile', {name: pending.invitedProfileName})}</p> : <>
                                    <label
                                        className="settings-field"><span>{t('settings.profileToConnect')}</span><select
                                        value={assignments[pending.id] ?? 'create'}
                                        onChange={event => setAssignments(current => ({
                                            ...current,
                                            [pending.id]: event.target.value
                                        }))}>
                                        <option value="create">{t('settings.createProfile')}</option>
                                        {availableProfiles.map(person => <option key={person.id}
                                                                                 value={person.id}>{person.displayName}</option>)}
                                    </select></label>
                                    {(assignments[pending.id] ?? 'create') === 'create' && <label
                                        className="settings-field"><span>{t('settings.newProfileName')}</span><input
                                        value={newNames[pending.id] ?? ''} onChange={event => setNewNames(current => ({
                                        ...current,
                                        [pending.id]: event.target.value
                                    }))} maxLength={255}/></label>}</>}
                            <button className="auth-primary"
                                    onClick={() => void approve(pending)}>{t('settings.approveAccount')}</button>
                        </article>)}
                    </div>}
            </section>}
            <section className="settings-card settings-danger-card">
                <div className="settings-card-heading"><span
                    className="settings-card-icon settings-danger-icon"><TriangleAlert size={19}/></span>
                    <div><h2>{t('settings.dangerZone')}</h2><p>{t('settings.dangerZoneHelp')}</p></div>
                </div>
                {dangerError && <p className="auth-error" role="alert">{dangerError}</p>}
                {account?.role === 'ADMIN' && <div className="danger-action-block">
                    <h3>{t('settings.newAdministrator')}</h3><p>{t('settings.newAdministratorHelp')}</p>
                    {activeAccounts.length === 0 ? <p className="settings-empty">{t('settings.noOtherAccounts')}</p> :
                        <div className="settings-inline-action"><select aria-label={t('settings.newAdministrator')}
                                                                        value={replacementAdminId}
                                                                        onChange={event => setReplacementAdminId(event.target.value)}>
                            <option value="">{t('settings.chooseAccount')}</option>
                            {activeAccounts.map(candidate => <option key={candidate.id}
                                                                     value={candidate.id}>{candidate.email}</option>)}
                        </select>
                            <button type="button" className="btn btn-danger-sm" disabled={!replacementAdminId}
                                    onClick={async () => {
                                        if (!window.confirm(t('settings.transferAdminConfirm'))) return
                                        setDangerError('')
                                        try {
                                            await api.admin.transferAdministrator(replacementAdminId);
                                            await refresh()
                                        } catch (cause) {
                                            setDangerError(cause instanceof Error ? cause.message : t('settings.dangerError'))
                                        }
                                    }}>{t('settings.transferAdmin')}</button>
                        </div>}
                </div>}
                {account?.role === 'ADMIN' && <div className="danger-action-block">
                    <h3>{t('settings.deleteProfiles')}</h3><p>{t('settings.deleteProfilesHelp')}</p>
                    {persons.length === 0 ? <p className="settings-empty">{t('settings.noProfiles')}</p> :
                        <div className="danger-profile-list">{persons.map(person => <div className="danger-profile-row"
                                                                                         key={person.id}>
                            <span>{person.displayName}</span>{person.activeAccountLinked ?
                            <small>{t('settings.profileHasAccount')}</small> :
                            <button type="button" className="btn btn-danger-sm" onClick={async () => {
                                if (!window.confirm(t('settings.deleteProfileConfirm', {name: person.displayName ?? ''}))) return
                                setDangerError('')
                                try {
                                    if (person.id) await deletePerson(person.id)
                                } catch (cause) {
                                    setDangerError(cause instanceof Error ? cause.message : t('settings.dangerError'))
                                }
                            }}>{t('settings.deleteProfile')}</button>}</div>)}</div>}
                </div>}
                {account?.role === 'ADMIN' && <div className="danger-action-block">
                    <h3>{t('settings.deleteHouseholds')}</h3><p>{t('settings.deleteHouseholdsHelp')}</p>
                    {households.length === 0 ? <p className="settings-empty">{t('settings.noHouseholds')}</p> :
                        <div className="danger-profile-list">{households.map(household => <div
                            className="danger-profile-row" key={household.id}><span>{household.name}</span>
                            <button type="button" className="btn btn-danger-sm" onClick={async () => {
                                if (!window.confirm(t('households.deleteConfirm', {name: household.name}))) return
                                setDangerError('')
                                try {
                                    await deleteHousehold(household.id)
                                } catch (cause) {
                                    setDangerError(cause instanceof Error ? cause.message : t('settings.dangerError'))
                                }
                            }}>{t('households.delete', {name: household.name})}</button>
                        </div>)}</div>}
                </div>}
                <div className="danger-action-block">
                    <h3>{t('settings.deleteOwnAccount')}</h3><p>{t('settings.deleteOwnAccountHelp')}</p>
                    <button type="button" className="btn btn-danger-sm" onClick={async () => {
                        if (!window.confirm(t('settings.deleteOwnAccountConfirm'))) return
                        setDangerError('')
                        try {
                            await api.auth.deleteAccount();
                            navigate('/login', {replace: true});
                            window.location.reload()
                        } catch (cause) {
                            setDangerError(cause instanceof Error ? cause.message : t('settings.dangerError'))
                        }
                    }}>{t('settings.deleteOwnAccount')}</button>
                </div>
            </section>
            {account?.role === 'ADMIN' && <section className="settings-card settings-admin-card">
                <div className="settings-card-heading"><span className="settings-card-icon"><MailPlus size={19}/></span>
                    <div><h2>{t('settings.invitations')}</h2><p>{t('settings.invitationsHelp')}</p></div>
                </div>
                <form className="invite-form" onSubmit={createInvitation}>
                    <label className="settings-field"><span>{t('auth.email')}</span><input type="email" required
                                                                                           value={inviteEmail}
                                                                                           onChange={event => setInviteEmail(event.target.value)}/></label>
                    <label className="settings-field"><span>{t('settings.inviteType')}</span><select value={inviteType}
                                                                                                     onChange={event => setInviteType(event.target.value)}>
                        <option value="SIMPLE">{t('settings.inviteSimple')}</option>
                        <option value="PROFILE">{t('settings.inviteProfile')}</option>
                        <option value="PROFILE_EMAIL">{t('settings.inviteProfileEmail')}</option>
                    </select></label>
                    {inviteType !== 'SIMPLE' &&
                        <label className="settings-field"><span>{t('settings.profileToConnect')}</span><select required
                                                                                                               value={invitePersonId}
                                                                                                               onChange={event => setInvitePersonId(event.target.value)}>
                            <option value="">{t('relationship.choose')}</option>
                            {availableProfiles.map(profile => <option key={profile.id}
                                                                      value={profile.id}>{profile.displayName}</option>)}
                        </select></label>}
                    <label className="settings-field"><span>{t('settings.inviteDuration')}</span><span
                        className="invite-duration"><input type="number" min={1} max={8760} required value={inviteHours}
                                                           onChange={event => setInviteHours(Number(event.target.value))}/><span>{t('settings.hours')}</span></span></label>
                    <button className="auth-primary">{t('settings.createInvite')}</button>
                </form>
                {createdInviteUrl &&
                    <div className="auth-success invite-created"><span>{t('settings.inviteCreated')}</span><input
                        readOnly value={createdInviteUrl} onFocus={event => event.currentTarget.select()}/>
                        <button type="button" className="auth-primary"
                                onClick={() => void navigator.clipboard?.writeText(createdInviteUrl)}>{t('settings.copyInvite')}</button>
                    </div>}
                {invitations.length > 0 &&
                    <div className="invitation-list">{invitations.map(invitation => <div className="invitation-row"
                                                                                         key={invitation.id}>
                        <strong>{invitation.email}</strong><span>{t(`settings.inviteType_${invitation.type}`)}{invitation.profileName ? ` · ${invitation.profileName}` : ''}</span><small>{t('settings.inviteExpires')}: {new Date(invitation.expiresAt).toLocaleString()}</small>
                    </div>)}</div>}
            </section>}
        </div>
    </section>
}
