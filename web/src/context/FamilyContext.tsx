import {createContext, type ReactNode, useCallback, useContext, useEffect, useState} from 'react'
import {api} from '../api/client'
import type {CreatePersonRequest, CreateRelationshipRequest, PersonResponse, RelationshipResponse} from '../api/models'
import type {HouseholdResponse} from '../api/models/householdResponse'
import {useToast} from './ToastContext'
import {useI18n} from './I18nContext'

interface FamilyContextValue {
    persons: PersonResponse[]
    filteredPersons: PersonResponse[]
    selectedPersonId: string | null
    selectedPerson: PersonResponse | null
    setSelectedPersonId: (id: string | null) => void
    loading: boolean
    error: string | null
    ancestors: PersonResponse[]
    descendants: PersonResponse[]
    siblings: PersonResponse[]
    relationships: RelationshipResponse[]
    households: HouseholdResponse[]
    relationshipError: string | null
    savePerson: (data: CreatePersonRequest, id?: string) => Promise<void>
    deletePerson: (id: string) => Promise<void>
    saveRelationship: (data: CreateRelationshipRequest) => Promise<void>
    reloadPersons: () => Promise<void>
    createHousehold: (name: string) => Promise<void>
    renameHousehold: (householdId: string, name: string) => Promise<void>
    addHouseholdMember: (householdId: string, personId: string) => Promise<void>
    addHouseholdMembers: (householdId: string, personIds: string[]) => Promise<void>
    removeHouseholdMember: (householdId: string, personId: string) => Promise<void>
    deleteHousehold: (householdId: string) => Promise<void>
}

const FamilyContext = createContext<FamilyContextValue | undefined>(undefined)

export function FamilyProvider({children}: { children: ReactNode }) {
    const {showToast} = useToast()
    const {t} = useI18n()
    const [persons, setPersons] = useState<PersonResponse[]>([])
    const [selectedPersonId, setSelectedPersonId] = useState<string | null>(null)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState<string | null>(null)
    const [ancestors, setAncestors] = useState<PersonResponse[]>([])
    const [descendants, setDescendants] = useState<PersonResponse[]>([])
    const [siblings, setSiblings] = useState<PersonResponse[]>([])
    const [relationships, setRelationships] = useState<RelationshipResponse[]>([])
    const [households, setHouseholds] = useState<HouseholdResponse[]>([])
    const [relationshipError, setRelationshipError] = useState<string | null>(null)

    const reloadPersons = useCallback(async () => {
        setLoading(true)
        setError(null)
        try {
            const [data, relationshipData, householdData] = await Promise.all([
                api.persons.list(),
                api.relationships.list(),
                api.households.list(),
            ])
            setPersons(data)
            setRelationships(relationshipData)
            setHouseholds(householdData)
            setSelectedPersonId((current) => {
                if (current && data.some((person) => person.id === current)) return current
                return data[0]?.id ?? null
            })
        } catch (cause) {
            setError(cause instanceof Error ? cause.message : 'load_failed')
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        void reloadPersons()
    }, [reloadPersons])

    useEffect(() => {
        if (!selectedPersonId) {
            setRelationshipError(null)
            setAncestors([])
            setDescendants([])
            setSiblings([])
            return
        }
        let active = true
        setRelationshipError(null)
        Promise.all([
            api.persons.ancestors(selectedPersonId),
            api.persons.descendants(selectedPersonId),
            api.persons.siblings(selectedPersonId),
        ]).then(([nextAncestors, nextDescendants, nextSiblings]) => {
            if (!active) return
            setAncestors(nextAncestors)
            setDescendants(nextDescendants)
            setSiblings(nextSiblings)
        }).catch(() => {
            if (!active) return
            setRelationshipError('load_failed')
            setAncestors([])
            setDescendants([])
            setSiblings([])
        })
        return () => {
            active = false
        }
    }, [selectedPersonId, persons])

    const filteredPersons = persons

    const selectedPerson = persons.find((person) => person.id === selectedPersonId) ?? null

    const savePerson = async (data: CreatePersonRequest, id?: string) => {
        if (id) {
            await api.persons.update(id, data)
            showToast(t('toast.personUpdated'))
        } else {
            const created = await api.persons.create(data)
            await reloadPersons()
            if (created.id) setSelectedPersonId(created.id)
            showToast(t('toast.personAdded'))
            return
        }
        await reloadPersons()
    }

    const deletePerson = async (id: string) => {
        await api.persons.delete(id)
        setPersons((current) => current.filter((person) => person.id !== id))
        setSelectedPersonId((current) => current === id ? null : current)
        showToast(t('toast.personDeleted'))
    }

    const saveRelationship = async (data: CreateRelationshipRequest) => {
        await api.relationships.create(data)
        showToast(t('toast.relationshipSaved'))
        await reloadPersons()
    }

    const createHousehold = async (name: string) => {
        await api.households.create(name)
        setHouseholds(await api.households.list())
        showToast(t('toast.householdCreated'))
    }
    const renameHousehold = async (householdId: string, name: string) => {
        await api.households.rename(householdId, name)
        setHouseholds(await api.households.list())
        showToast(t('toast.householdRenamed'))
    }
    const addHouseholdMember = async (householdId: string, personId: string) => {
        await api.households.addMember(householdId, personId)
        setHouseholds(await api.households.list())
        showToast(t('toast.personAddedToHousehold'))
    }
    const addHouseholdMembers = async (householdId: string, personIds: string[]) => {
        await api.households.addMembers(householdId, personIds)
        setHouseholds(await api.households.list())
        showToast(personIds.length === 1
            ? t('toast.onePersonAddedToHousehold')
            : t('toast.peopleAddedToHousehold', {count: personIds.length}))
    }
    const removeHouseholdMember = async (householdId: string, personId: string) => {
        await api.households.removeMember(householdId, personId)
        setHouseholds(await api.households.list())
        showToast(t('toast.membershipRemoved'))
    }
    const deleteHousehold = async (householdId: string) => {
        await api.households.delete(householdId)
        setHouseholds(await api.households.list())
        showToast(t('toast.householdDeleted'))
    }

    return <FamilyContext.Provider value={{
        persons,
        filteredPersons,
        selectedPersonId,
        selectedPerson,
        setSelectedPersonId,
        loading,
        error,
        ancestors,
        descendants,
        siblings,
        relationships,
        relationshipError,
        households,
        savePerson,
        deletePerson,
        saveRelationship,
        reloadPersons,
        createHousehold,
        renameHousehold,
        addHouseholdMember,
        addHouseholdMembers,
        removeHouseholdMember,
        deleteHousehold,
    }}>{children}</FamilyContext.Provider>
}

export function useFamily() {
    const context = useContext(FamilyContext)
    if (!context) throw new Error('useFamily deve essere utilizzato all’interno di FamilyProvider')
    return context
}
