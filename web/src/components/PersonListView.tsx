import React, {useState} from 'react'
import {Edit2, GitFork, Plus, Search, User} from './GoogleIcon'
import type {PersonResponse} from '../api/models'
import {getAvatarForPerson, getGenderCategory} from '../utils/avatar'
import {useI18n} from '../context/I18nContext'

interface PersonListViewProps {
    persons: PersonResponse[]
    selectedPersonId: string | null
    onSelectPerson: (id: string) => void
    onAddPerson: () => void
    onEditPerson: (person: PersonResponse) => void
    onAddRelationship: (personId: string) => void
    isAdmin: boolean
    ownPersonId: string | null
}

export const PersonListView: React.FC<PersonListViewProps> = ({
                                                                  persons,
                                                                  selectedPersonId,
                                                                  onSelectPerson,
                                                                  onAddPerson,
                                                                  onEditPerson,
                                                                  onAddRelationship,
                                                                  isAdmin,
                                                                  ownPersonId,
                                                              }) => {
    const {t} = useI18n()
    const [filter, setFilter] = useState<'all' | 'maschio' | 'femmina' | 'altro'>('all')
    const [localSearch, setLocalSearch] = useState('')

    const filteredPersons = persons.filter((p) => {
        const matchesFilter =
            filter === 'all' || getGenderCategory(p.gender) === filter
        const matchesSearch =
            !localSearch ||
            (p.displayName || '').toLowerCase().includes(localSearch.toLowerCase())
        return matchesFilter && matchesSearch
    })

    return (
        <div className="person-list-view-container">
            {/* Barra comandi lista */}
            <div className="list-toolbar">
                <div className="list-search-wrapper">
                    <Search size={16} className="list-search-icon"/>
                    <input
                        type="text"
                        placeholder={t('person.listSearch')}
                        value={localSearch}
                        onChange={(e) => setLocalSearch(e.target.value)}
                        className="list-search-input"
                    />
                </div>

                <div className="list-filters-segmented">
                    <button
                        type="button"
                        className={`list-filter-btn ${filter === 'all' ? 'active' : ''}`}
                        onClick={() => setFilter('all')}
                    >
                        {t('person.all', {count: persons.length})}
                    </button>
                    <button
                        type="button"
                        className={`list-filter-btn ${filter === 'maschio' ? 'active' : ''}`}
                        onClick={() => setFilter('maschio')}
                    >
                        {t('person.males')}
                    </button>
                    <button
                        type="button"
                        className={`list-filter-btn ${filter === 'femmina' ? 'active' : ''}`}
                        onClick={() => setFilter('femmina')}
                    >
                        {t('person.females')}
                    </button>
                </div>

                {isAdmin && <button type="button" className="btn btn-primary" onClick={onAddPerson}>
                    <Plus size={16}/> {t('family.addPerson')}
                </button>}
            </div>

            {/* Tabella o Card dei familiari */}
            {filteredPersons.length === 0 ? (
                <div className="empty-list-placeholder">
                    <User size={32}/>
                    <p>{t('person.notFound')}</p>
                </div>
            ) : (
                <div className="members-table-container">
                    <table className="members-table">
                        <thead>
                        <tr>
                            <th>{t('person.columnPerson')}</th>
                            <th>{t('person.columnGender')}</th>
                            <th>{t('person.columnBirthDate')}</th>
                            <th>{t('person.columnId')}</th>
                            <th className="text-right">{t('person.columnActions')}</th>
                        </tr>
                        </thead>
                        <tbody>
                        {filteredPersons.map((p) => {
                            const isSelected = selectedPersonId === p.id
                            const genderCat = getGenderCategory(p.gender)
                            const avatar = getAvatarForPerson(p.displayName || '', p.gender)

                            return (
                                <tr
                                    key={p.id}
                                    className={`member-row ${isSelected ? 'row-selected' : ''}`}
                                    onClick={() => p.id && onSelectPerson(p.id)}
                                >
                                    <td>
                                        <div className="member-name-cell">
                                            <img src={avatar} alt={p.displayName || ''} className="member-avatar-cell"/>
                                            <div>
                                                <strong className="member-name-text">{p.displayName}</strong>
                                            </div>
                                        </div>
                                    </td>
                                    <td>
                      <span className={`gender-tag tag-${genderCat}`}>
                        {genderCat === 'maschio'
                            ? t('person.male')
                            : genderCat === 'femmina'
                                ? t('person.female')
                                : t('person.other')}
                      </span>
                                    </td>
                                    <td>{p.birthDate || '—'}</td>
                                    <td>{p.id?.slice(0, 8) || '—'}</td>
                                    <td className="text-right" onClick={(e) => e.stopPropagation()}>
                                        <div className="table-row-actions">
                                            {isAdmin && <button
                                                type="button"
                                                className="action-icon-btn"
                                                title={t('person.connectTitle')}
                                                onClick={() => p.id && onAddRelationship(p.id)}
                                            >
                                                <GitFork size={16}/>
                                            </button>}
                                            {(isAdmin || p.id === ownPersonId) && <button
                                                type="button"
                                                className="action-icon-btn"
                                                title={t('person.editTitle')}
                                                onClick={() => onEditPerson(p)}
                                            >
                                                <Edit2 size={16}/>
                                            </button>}
                                        </div>
                                    </td>
                                </tr>
                            )
                        })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    )
}
