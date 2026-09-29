import React, {lazy, Suspense, useState} from 'react'
import {GitFork, List, Plus, Users2,} from '../components/GoogleIcon'
import type {PersonResponse, RelationshipResponse} from '../api/models'
import type {FamilyViewMode} from '../types'
import {PersonListView} from '../components/PersonListView'
import {PersonDetailPanel} from '../components/PersonDetailPanel'
import type {HouseholdResponse} from '../api/models/householdResponse'
import {FamilySectionTabs} from '../components/FamilySectionTabs'
import {useI18n} from '../context/I18nContext'

const FamilyTreeCanvas = lazy(() => import('../components/FamilyTreeCanvas').then(({FamilyTreeCanvas: Canvas}) => ({default: Canvas})))

interface FamilyTreeViewProps {
    persons: PersonResponse[]
    allPersons: PersonResponse[]
    relationships: RelationshipResponse[]
    households: HouseholdResponse[]
    selectedPerson: PersonResponse | null
    selectedPersonId: string | null
    onSelectPerson: (id: string | null) => void
    onAddPerson: () => void
    onEditPerson: (person: PersonResponse) => void
    onAddRelationship: (personId: string) => void
    ancestors: PersonResponse[]
    descendants: PersonResponse[]
    siblings: PersonResponse[]
    relationshipError: string | null
    isAdmin: boolean
    ownPersonId: string | null
}

export const FamilyTreeView: React.FC<FamilyTreeViewProps> = ({
                                                                  persons,
                                                                  allPersons,
                                                                  relationships,
                                                                  households,
                                                                  selectedPerson,
                                                                  selectedPersonId,
                                                                  onSelectPerson,
                                                                  onAddPerson,
                                                                  onEditPerson,
                                                                  onAddRelationship,
                                                                  ancestors,
                                                                  descendants,
                                                                  siblings,
                                                                  relationshipError,
                                                                  isAdmin,
                                                                  ownPersonId,
                                                              }) => {
    const [viewMode, setViewMode] = useState<FamilyViewMode>('family')
    const {t} = useI18n()

    return (
        <div className="family-tree-page-layout">
            {/* Colonna Principale dell'Albero */}
            <div className="family-tree-main-content">
                <FamilySectionTabs/>
                {/* Intestazione Sezione */}
                <div className="page-header-row">
                    <div className="page-title-group">
                        <div className="page-title-icon-badge">
                            <Users2 size={24} color="#2563eb"/>
                        </div>
                        <div>
                            <h2 className="page-title">{t('family.title')}</h2>
                            <p className="page-subtitle">{t('family.subtitle')}</p>
                        </div>
                    </div>

                    <div className="page-header-actions">
                        {/* View Mode Switcher */}
                        <div className="view-mode-pill-group">
                            <button
                                type="button"
                                className={`view-pill-btn ${viewMode === 'family' ? 'active' : ''}`}
                                onClick={() => setViewMode('family')}
                            >
                                <GitFork size={16}/>
                                <span>{t('family.treeView')}</span>
                            </button>
                            <button
                                type="button"
                                className={`view-pill-btn ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                <List size={16}/>
                                <span>{t('family.listView')}</span>
                            </button>
                        </div>

                        {isAdmin && <button
                            type="button"
                            className="btn btn-primary"
                            onClick={onAddPerson}
                        >
                            <Plus size={16}/>
                            <span>{t('family.newPerson')}</span>
                        </button>}
                    </div>
                </div>

                {/* Area di Visualizzazione: Albero o Elenco */}
                <div className="family-tree-canvas-wrapper">
                    {viewMode === 'family' ? (
                        <Suspense fallback={<div className="empty-tree-placeholder"
                                                 role="status">{t('family.loadingTree')}</div>}>
                            <FamilyTreeCanvas
                                allPersons={allPersons}
                                households={households}
                                canAddPerson={isAdmin}
                                relationships={relationships}
                                selectedPersonId={selectedPersonId}
                                relationshipError={relationshipError}
                                onSelectPerson={(id) => onSelectPerson(id)}
                                onAddPerson={onAddPerson}
                            />
                        </Suspense>
                    ) : (
                        <PersonListView
                            persons={persons}
                            selectedPersonId={selectedPersonId}
                            onSelectPerson={(id) => onSelectPerson(id)}
                            onAddPerson={onAddPerson}
                            onEditPerson={onEditPerson}
                            onAddRelationship={onAddRelationship}
                            isAdmin={isAdmin}
                            ownPersonId={ownPersonId}
                        />
                    )}
                </div>
            </div>

            {/* Pannello Dettaglio Laterale Destro */}
            {selectedPerson && (
                <PersonDetailPanel
                    person={selectedPerson}
                    onClose={() => onSelectPerson(null)}
                    onSelectPerson={(id) => onSelectPerson(id)}
                    onEditPerson={onEditPerson}
                    onAddRelationship={onAddRelationship}
                    ancestors={ancestors}
                    descendants={descendants}
                    siblings={siblings}
                    relationships={relationships}
                    relationshipError={relationshipError}
                    isAdmin={isAdmin}
                    canEdit={isAdmin || selectedPerson.id === ownPersonId}
                />
            )}
        </div>
    )
}
