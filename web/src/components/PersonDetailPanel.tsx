import {Calendar, ChevronRight, GitFork, Pencil, UserRound, X} from './GoogleIcon'
import type {PersonResponse, RelationshipResponse} from '../api/models'
import {getAvatarForPerson} from '../utils/avatar'
import {useI18n} from '../context/I18nContext'

interface PersonDetailPanelProps {
    person: PersonResponse | null
    onClose: () => void
    onSelectPerson: (id: string) => void
    onEditPerson: (person: PersonResponse) => void
    onAddRelationship: (personId: string) => void
    ancestors: PersonResponse[]
    descendants: PersonResponse[]
    siblings: PersonResponse[]
    relationships: RelationshipResponse[]
    relationshipError: string | null
    isAdmin: boolean
    canEdit: boolean
}

export function PersonDetailPanel({
                                      person,
                                      onClose,
                                      onSelectPerson,
                                      onEditPerson,
                                      onAddRelationship,
                                      ancestors,
                                      descendants,
                                      siblings,
                                      relationships,
                                      relationshipError,
                                      isAdmin,
                                      canEdit
                                  }: PersonDetailPanelProps) {
    const {t} = useI18n()
    if (!person) return null
    const partnerByPersonId = new Map<string, { person: PersonResponse; label: string }>()
    relationships.forEach((relationship) => {
        if (relationship.type !== 'SPOUSE_OF' && relationship.type !== 'PARTNER_OF') return
        const personA = relationship.personA
        const personB = relationship.personB
        const related = personA?.id === person.id ? personB : personB?.id === person.id ? personA : undefined
        if (!related?.id) return
        const label = relationship.type === 'SPOUSE_OF' ? t('relationship.spouse') : t('relationship.partner')
        const current = partnerByPersonId.get(related.id)
        if (!current || relationship.type === 'SPOUSE_OF') partnerByPersonId.set(related.id, {person: related, label})
    })
    const groups = [
        [t('relationship.partnerGroup'), [...partnerByPersonId.values()]],
        [t('relationship.ancestors'), ancestors],
        [t('relationship.siblings'), siblings],
        [t('relationship.descendants'), descendants],
    ] as const
    return <aside className="person-detail-panel"
                  aria-label={t('person.detail', {name: person.displayName ?? t('person.noName')})}>
        <button type="button" className="detail-close-btn" onClick={onClose} aria-label={t('person.closeDetail')}><X
            size={18}/></button>
        <div className="detail-cover-container">
            <div className="detail-avatar-wrapper"><img
                src={getAvatarForPerson(person.displayName ?? '', person.gender)} alt="" className="detail-avatar-img"/>
            </div>
        </div>
        <div className="detail-body">
            <div className="detail-name-section"><h2 className="detail-name">{person.displayName}</h2><p
                className="detail-subtitle">{person.gender === 'MALE' ? t('person.male') : person.gender === 'FEMALE' ? t('person.female') : person.gender === 'OTHER' ? t('person.other') : t('person.genderUnknown')}</p>
            </div>
            <div className="detail-quick-actions">
                {isAdmin && <button type="button" className="action-pill-btn"
                                    onClick={() => person.id && onAddRelationship(person.id)}><GitFork
                    size={16}/><span>{t('person.connect')}</span></button>}
                {canEdit &&
                    <button type="button" className="action-pill-btn" onClick={() => onEditPerson(person)}><Pencil
                        size={16}/><span>{t('person.editTitle')}</span></button>}
            </div>
            <div className="detail-section">
                <h3 className="detail-section-title">{t('person.relationships')}</h3>
                <div className="relations-list">
                    {groups.flatMap(([label, people]) => people.map((entry) => {
                        const related = 'person' in entry ? entry.person : entry
                        const relationLabel = 'label' in entry ? entry.label : label
                        return <button key={`${relationLabel}-${related.id}`} type="button"
                                       className="relation-item-btn"
                                       onClick={() => related.id && onSelectPerson(related.id)}>
                            <img src={getAvatarForPerson(related.displayName ?? '', related.gender)} alt=""
                                 className="relation-avatar"/>
                            <span className="relation-info"><span className="relation-role">{relationLabel}</span><span
                                className="relation-name">{related.displayName}</span></span><ChevronRight size={16}
                                                                                                           className="relation-chevron"/>
                        </button>
                    }))}
                    {relationshipError ? <p className="empty-relations-hint"
                                            role="alert">{t('relationship.loadError')}</p> : groups.every(([, people]) => people.length === 0) &&
                        <p className="empty-relations-hint">{t('person.noRelationships')}</p>}
                </div>
            </div>
            <div className="detail-section"><h3 className="detail-section-title">{t('person.data')}</h3>
                <div className="info-list">
                    <div className="info-item"><Calendar size={16}/>
                        <div className="info-item-content"><span
                            className="info-label">{t('person.birthDate')}</span><span
                            className="info-val">{person.birthDate || t('common.notAvailable')}</span></div>
                    </div>
                    <div className="info-item"><UserRound size={16}/>
                        <div className="info-item-content"><span className="info-label">{t('person.id')}</span><span
                            className="info-val">{person.id}</span></div>
                    </div>
                </div>
            </div>
        </div>
    </aside>
}
