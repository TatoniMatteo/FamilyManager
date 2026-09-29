import React, {useEffect, useState} from 'react'
import {GitFork, X} from './GoogleIcon'
import type {CreateRelationshipRequest, PersonResponse} from '../api/models'
import {CreateRelationshipRequestStatus, CreateRelationshipRequestType} from '../api/models'
import {useI18n} from '../context/I18nContext'

interface RelationshipModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (data: CreateRelationshipRequest) => Promise<void>
    persons: PersonResponse[]
    initialPersonAId?: string
}

export const RelationshipModal: React.FC<RelationshipModalProps> = ({
                                                                        isOpen,
                                                                        onClose,
                                                                        onSave,
                                                                        persons,
                                                                        initialPersonAId,
                                                                    }) => {
    const {t} = useI18n()
    const [personAId, setPersonAId] = useState(initialPersonAId || (persons[0]?.id ?? ''))
    const [personBId, setPersonBId] = useState(
        persons.find((p) => p.id !== (initialPersonAId || persons[0]?.id))?.id ?? ''
    )
    const [type, setType] = useState<CreateRelationshipRequestType>(
        CreateRelationshipRequestType.PARENT_OF
    )
    const [status, setStatus] = useState<CreateRelationshipRequestStatus>(
        CreateRelationshipRequestStatus.MARRIED
    )
    const [biological, setBiological] = useState(true)
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (!isOpen) return
        const firstPersonId = initialPersonAId || persons[0]?.id || ''
        setPersonAId(firstPersonId)
        setPersonBId(persons.find((person) => person.id !== firstPersonId)?.id || '')
        setError(null)
    }, [isOpen, initialPersonAId, persons])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!personAId || !personBId) {
            setError(t('relationship.selectBoth'))
            return
        }
        if (personAId === personBId) {
            setError(t('relationship.noSelf'))
            return
        }

        try {
            setLoading(true)
            setError(null)
            await onSave({
                personAId,
                personBId,
                type,
                status:
                    type === CreateRelationshipRequestType.SPOUSE_OF ||
                    type === CreateRelationshipRequestType.PARTNER_OF
                        ? status
                        : undefined,
                biological: type === CreateRelationshipRequestType.PARENT_OF ? biological : undefined,
            })
            onClose()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('relationship.saveError'))
        } finally {
            setLoading(false)
        }
    }

    const isCoupleType =
        type === CreateRelationshipRequestType.SPOUSE_OF ||
        type === CreateRelationshipRequestType.PARTNER_OF

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-wrap">
                        <div className="modal-icon-badge">
                            <GitFork size={20}/>
                        </div>
                        <h3>{t('relationship.modalTitle')}</h3>
                    </div>
                    <button type="button" className="modal-close-btn" onClick={onClose}>
                        <X size={20}/>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body-form">
                    {error && <div className="modal-error-banner">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="personA">{t('relationship.personA')}</label>
                        <select
                            id="personA"
                            className="form-select"
                            value={personAId}
                            onChange={(e) => setPersonAId(e.target.value)}
                            required
                        >
                            <option value="">{t('relationship.choose')}</option>
                            {persons.map((p) => (
                                <option key={p.id} value={p.id}>
                                    {p.displayName} {p.birthDate ? `(${p.birthDate.slice(0, 4)})` : ''}
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="form-group">
                        <label htmlFor="relType">{t('relationship.type')}</label>
                        <select
                            id="relType"
                            className="form-select"
                            value={type}
                            onChange={(e) => setType(e.target.value as CreateRelationshipRequestType)}
                            required
                        >
                            <option value={CreateRelationshipRequestType.PARENT_OF}>
                                {t('relationship.parentOf')}
                            </option>
                            <option value={CreateRelationshipRequestType.SPOUSE_OF}>
                                {t('relationship.spouseOf')}
                            </option>
                            <option value={CreateRelationshipRequestType.PARTNER_OF}>
                                {t('relationship.partnerOf')}
                            </option>
                        </select>
                        {type === CreateRelationshipRequestType.PARENT_OF && (
                            <p className="form-help-text">
                                {t('relationship.siblingsHelp')}
                            </p>
                        )}
                    </div>

                    <div className="form-group">
                        <label htmlFor="personB">{t('relationship.personB')}</label>
                        <select
                            id="personB"
                            className="form-select"
                            value={personBId}
                            onChange={(e) => setPersonBId(e.target.value)}
                            required
                        >
                            <option value="">{t('relationship.chooseSecond')}</option>
                            {persons
                                .filter((p) => p.id !== personAId)
                                .map((p) => (
                                    <option key={p.id} value={p.id}>
                                        {p.displayName} {p.birthDate ? `(${p.birthDate.slice(0, 4)})` : ''}
                                    </option>
                                ))}
                        </select>
                    </div>

                    {isCoupleType && (
                        <div className="form-group">
                            <label htmlFor="relStatus">{t('relationship.status')}</label>
                            <select
                                id="relStatus"
                                className="form-select"
                                value={status}
                                onChange={(e) => setStatus(e.target.value as CreateRelationshipRequestStatus)}
                            >
                                <option
                                    value={CreateRelationshipRequestStatus.MARRIED}>{t('relationship.married')}</option>
                                <option
                                    value={CreateRelationshipRequestStatus.PARTNERED}>{t('relationship.partnered')}</option>
                                <option
                                    value={CreateRelationshipRequestStatus.SEPARATED}>{t('relationship.separated')}</option>
                                <option
                                    value={CreateRelationshipRequestStatus.DIVORCED}>{t('relationship.divorced')}</option>
                                <option
                                    value={CreateRelationshipRequestStatus.WIDOWED}>{t('relationship.widowed')}</option>
                            </select>
                        </div>
                    )}

                    {type === CreateRelationshipRequestType.PARENT_OF && (
                        <div className="form-group form-checkbox">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={biological}
                                    onChange={(e) => setBiological(e.target.checked)}
                                />
                                <span>{t('relationship.biological')}</span>
                            </label>
                        </div>
                    )}

                    <div className="modal-actions">
                        <button
                            type="button"
                            className="btn btn-secondary"
                            onClick={onClose}
                            disabled={loading}
                        >
                            {t('common.cancel')}
                        </button>
                        <button type="submit" className="btn btn-primary" disabled={loading}>
                            {loading ? t('relationship.saving') : t('relationship.confirm')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
