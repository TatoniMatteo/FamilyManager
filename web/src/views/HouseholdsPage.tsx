import {type FormEvent, useState} from 'react'
import {Check, Home, Pencil, Plus, Search, UserMinus, Users2, X} from '../components/GoogleIcon'
import {FamilySectionTabs} from '../components/FamilySectionTabs'
import {useFamily} from '../context/FamilyContext'
import {useToast} from '../context/ToastContext'
import {useI18n} from '../context/I18nContext'
import {useAuth} from '../context/AuthContext'

export function HouseholdsPage() {
    const {
        households,
        persons,
        loading,
        error,
        createHousehold,
        renameHousehold,
        addHouseholdMembers,
        removeHouseholdMember
    } = useFamily()
    const {showToast} = useToast()
    const {t} = useI18n()
    const {account} = useAuth()
    const isAdmin = account?.role === 'ADMIN'
    const [name, setName] = useState('')
    const [editingHouseholdId, setEditingHouseholdId] = useState<string | null>(null)
    const [editedName, setEditedName] = useState('')
    const [selectedPeople, setSelectedPeople] = useState<Record<string, string[]>>({})
    const [memberSearch, setMemberSearch] = useState<Record<string, string>>({})
    const [saving, setSaving] = useState(false)

    const run = async (action: () => Promise<void>) => {
        setSaving(true)
        try {
            await action()
        } catch (cause) {
            const message = cause instanceof Error ? cause.message : ''
            showToast(message === 'Esiste già un nucleo con questo nome.' ? t('households.duplicateName') : message || t('households.operationError'))
        } finally {
            setSaving(false)
        }
    }

    const create = async (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault()
        if (!name.trim()) return
        await run(async () => {
            await createHousehold(name.trim());
            setName('')
        })
    }

    const saveName = async (event: FormEvent<HTMLFormElement>, householdId: string) => {
        event.preventDefault()
        if (!editedName.trim()) return
        await run(async () => {
            await renameHousehold(householdId, editedName.trim());
            setEditingHouseholdId(null)
        })
    }

    const addSelectedPeople = (event: FormEvent<HTMLFormElement>, householdId: string) => {
        event.preventDefault()
        const selected = selectedPeople[householdId] ?? []
        if (!selected.length) return
        void run(async () => {
            await addHouseholdMembers(householdId, selected)
            setSelectedPeople((current) => ({...current, [householdId]: []}))
        })
    }

    return <section className="households-page">
        <FamilySectionTabs/>
        <header className="page-header-row">
            <div className="page-title-group">
                <div className="page-title-icon-badge"><Home size={23}/></div>
                <div><h1 className="page-title">{t('households.title')}</h1><p
                    className="page-subtitle">{t('households.subtitle')}</p></div>
            </div>
        </header>
        {error && <div className="data-state-card" role="alert">
            <strong>{t('households.loadError')}</strong><span>{error}</span></div>}
        {isAdmin && <form className="household-create-card" onSubmit={create}>
            <label htmlFor="household-name">{t('households.create')}</label>
            <div><input id="household-name" value={name} onChange={(event) => setName(event.target.value)}
                        placeholder={t('households.namePlaceholder')} maxLength={120} required/>
                <button className="btn btn-primary" disabled={saving || !name.trim()}><Plus
                    size={16}/>{t('households.createButton')}</button>
            </div>
            <small>{t('households.nameUnique')}</small>
        </form>}
        {loading ?
            <div className="data-state-card" role="status">{t('households.loading')}</div> : households.length === 0 ?
                <div className="households-empty"><Users2 size={28}/><h2>{t('households.emptyTitle')}</h2>
                    <p>{t('households.emptyText')}</p></div> : <div className="household-grid">
                    {households.map((household) => {
                        const members = new Set(household.members.map(({person}) => person.id))
                        const available = persons.filter((person) => person.id && !members.has(person.id))
                        const query = (memberSearch[household.id] ?? '').trim().toLocaleLowerCase()
                        const visiblePeople = available.filter((person) => person.displayName?.toLocaleLowerCase().includes(query))
                        const selected = selectedPeople[household.id] ?? []
                        return <article className="household-card" key={household.id}>
                            <header className="household-card-header">
                                <div className="household-heading">
                                    {editingHouseholdId === household.id ? <form className="household-rename-form"
                                                                                 onSubmit={(event) => void saveName(event, household.id)}>
                                        <input aria-label={t('households.newName')} value={editedName}
                                               onChange={(event) => setEditedName(event.target.value)} maxLength={120}
                                               autoFocus required/>
                                        <button type="submit" aria-label={t('households.saveName')}
                                                title={t('households.saveName')}
                                                disabled={saving || !editedName.trim()}><Check size={17}/></button>
                                        <button type="button" aria-label={t('households.cancelEdit')}
                                                title={t('common.cancel')} onClick={() => setEditingHouseholdId(null)}>
                                            <X size={17}/></button>
                                    </form> : <><h2>{household.name}</h2>{isAdmin &&
                                        <button type="button" className="household-edit-name"
                                                title={t('households.editName', {name: household.name})}
                                                aria-label={t('households.editName', {name: household.name})}
                                                disabled={saving} onClick={() => {
                                            setEditingHouseholdId(household.id);
                                            setEditedName(household.name)
                                        }}><Pencil size={15}/></button>}</>}
                                    <p>{household.members.length} {household.members.length === 1 ? t('households.onePerson') : t('households.people')}</p>
                                </div>
                            </header>
                            <ul className="household-members">{household.members.map(({person}) => <li key={person.id}>
                                <span
                                    className="household-member-avatar">{person.displayName?.trim().charAt(0).toLocaleUpperCase() || '?'}</span><span>{person.displayName || t('person.noName')}</span>{isAdmin &&
                                <button type="button"
                                        title={t('households.removePerson', {name: person.displayName ?? t('person.noName')})}
                                        aria-label={t('households.removePerson', {name: person.displayName ?? t('person.noName')})}
                                        disabled={saving}
                                        onClick={() => person.id && void run(() => removeHouseholdMember(household.id, person.id!))}>
                                    <UserMinus size={16}/></button>}</li>)}</ul>
                            {isAdmin && available.length > 0 ? <details className="household-member-picker">
                                <summary><Plus
                                    size={16}/><span>{t('households.addPeople')}</span><small>{selected.length > 0 ? selected.length === 1 ? t('households.oneSelected') : t('households.selected', {count: selected.length}) : available.length === 1 ? t('households.oneAvailable') : t('households.available', {count: available.length})}</small>
                                </summary>
                                <form onSubmit={(event) => addSelectedPeople(event, household.id)}>
                                    <label className="household-member-search"><Search size={16}/><input type="search"
                                                                                                         placeholder={t('households.searchPeople')}
                                                                                                         aria-label={t('households.searchPeopleAria', {name: household.name})}
                                                                                                         value={memberSearch[household.id] ?? ''}
                                                                                                         onChange={(event) => setMemberSearch((current) => ({
                                                                                                             ...current,
                                                                                                             [household.id]: event.target.value
                                                                                                         }))}/></label>
                                    <div className="household-person-options" role="group"
                                         aria-label={t('households.peopleAvailableFor', {name: household.name})}>
                                        {visiblePeople.length > 0 ? visiblePeople.map((person) => person.id &&
                                                <label className="household-person-option" key={person.id}>
                                                    <input type="checkbox" checked={selected.includes(person.id)}
                                                           onChange={(event) => setSelectedPeople((current) => ({
                                                               ...current,
                                                               [household.id]: event.target.checked ? [...(current[household.id] ?? []), person.id!] : (current[household.id] ?? []).filter((id) => id !== person.id)
                                                           }))}/>
                                                    <span
                                                        className="household-member-avatar">{person.displayName?.trim().charAt(0).toLocaleUpperCase() || '?'}</span><span>{person.displayName || t('person.noName')}</span>
                                                </label>) :
                                            <p className="household-picker-empty">{t('households.noMatch')}</p>}
                                    </div>
                                    <button className="btn btn-primary household-add-selected" type="submit"
                                            disabled={saving || selected.length === 0}><Check
                                        size={15}/>{selected.length > 0 ? t('households.addSelected', {count: selected.length}) : t('households.addSelectedEmpty')}
                                    </button>
                                </form>
                            </details> : <p className="household-all-members">{t('households.allMembers')}</p>}
                        </article>
                    })}
                </div>}
    </section>
}
