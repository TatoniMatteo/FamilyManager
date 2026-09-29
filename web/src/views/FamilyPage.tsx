import {useEffect, useState} from 'react'
import {useNavigate, useParams} from 'react-router-dom'
import {FamilyTreeView} from './FamilyTreeView'
import {PersonModal} from '../components/PersonModal'
import {RelationshipModal} from '../components/RelationshipModal'
import {useFamily} from '../context/FamilyContext'
import type {PersonResponse} from '../api/models'
import {useI18n} from '../context/I18nContext'
import {useAuth} from '../context/AuthContext'

export function FamilyPage() {
    const family = useFamily()
    const {account} = useAuth()
    const {personId} = useParams()
    const navigate = useNavigate()
    const [personModalOpen, setPersonModalOpen] = useState(false)
    const [personToEdit, setPersonToEdit] = useState<PersonResponse | null>(null)
    const [relationshipModalOpen, setRelationshipModalOpen] = useState(false)
    const [relationshipPersonId, setRelationshipPersonId] = useState<string | undefined>()
    const {t} = useI18n()

    useEffect(() => {
        if (family.loading) return
        if (personId && family.persons.some((person) => person.id === personId)) {
            family.setSelectedPersonId(personId)
        } else if (personId) {
            navigate('/family', {replace: true})
        }
    }, [family.loading, family.persons, family.setSelectedPersonId, navigate, personId])

    const selectPerson = (id: string | null) => {
        family.setSelectedPersonId(id)
        navigate(id ? `/family/${id}` : '/family')
    }

    const addPerson = () => {
        setPersonToEdit(null);
        setPersonModalOpen(true)
    }
    const editPerson = (person: PersonResponse) => {
        setPersonToEdit(person);
        setPersonModalOpen(true)
    }
    const addRelationship = (personId?: string) => {
        setRelationshipPersonId(personId ?? family.selectedPersonId ?? undefined)
        setRelationshipModalOpen(true)
    }

    if (family.error) return <section className="data-state-card" role="alert">
        <h1>{t('family.loadError')}</h1><p>{family.error === 'load_failed' ? t('family.loadFailed') : family.error}</p>
        <button className="btn btn-primary" onClick={() => void family.reloadPersons()}>{t('common.retry')}</button>
    </section>
    if (family.loading) return <section className="data-state-card" role="status">{t('family.loading')}</section>

    return <>
        <FamilyTreeView
            persons={family.filteredPersons}
            allPersons={family.persons}
            relationships={family.relationships}
            households={family.households}
            selectedPerson={family.selectedPerson}
            selectedPersonId={family.selectedPersonId}
            onSelectPerson={selectPerson}
            onAddPerson={addPerson}
            onEditPerson={editPerson}
            onAddRelationship={addRelationship}
            ancestors={family.ancestors}
            descendants={family.descendants}
            siblings={family.siblings}
            relationshipError={family.relationshipError}
            isAdmin={account?.role === 'ADMIN'}
            ownPersonId={account?.personId ?? null}
        />
        <PersonModal isOpen={personModalOpen} onClose={() => setPersonModalOpen(false)} onSave={family.savePerson}
                     initialPerson={personToEdit}/>
        <RelationshipModal isOpen={relationshipModalOpen} onClose={() => setRelationshipModalOpen(false)}
                           onSave={family.saveRelationship} persons={family.persons}
                           initialPersonAId={relationshipPersonId}/>
    </>
}
