import React, {useEffect, useState} from 'react'
import {UserCheck, UserPlus, X} from './GoogleIcon'
import type {CreatePersonRequest, PersonResponse} from '../api/models'
import {useI18n} from '../context/I18nContext'

interface PersonModalProps {
    isOpen: boolean
    onClose: () => void
    onSave: (data: CreatePersonRequest, id?: string) => Promise<void>
    initialPerson?: PersonResponse | null
}

export const PersonModal: React.FC<PersonModalProps> = ({
                                                            isOpen,
                                                            onClose,
                                                            onSave,
                                                            initialPerson,
                                                        }) => {
    const {t} = useI18n()
    const [displayName, setDisplayName] = useState('')
    const [birthDate, setBirthDate] = useState('')
    const [gender, setGender] = useState<string>('MALE')
    const [loading, setLoading] = useState(false)
    const [error, setError] = useState<string | null>(null)

    useEffect(() => {
        if (initialPerson) {
            setDisplayName(initialPerson.displayName || '')
            setBirthDate(initialPerson.birthDate || '')
            setGender(initialPerson.gender || 'MALE')
        } else {
            setDisplayName('')
            setBirthDate('')
            setGender('MALE')
        }
        setError(null)
    }, [initialPerson, isOpen])

    if (!isOpen) return null

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault()
        if (!displayName.trim()) {
            setError(t('common.nameRequired'))
            return
        }

        try {
            setLoading(true)
            setError(null)
            await onSave(
                {
                    displayName: displayName.trim(),
                    birthDate: birthDate ? birthDate : undefined,
                    gender: gender || undefined,
                },
                initialPerson?.id
            )
            onClose()
        } catch (err: unknown) {
            setError(err instanceof Error ? err.message : t('person.saveError'))
        } finally {
            setLoading(false)
        }
    }

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-dialog" onClick={(e) => e.stopPropagation()}>
                <div className="modal-header">
                    <div className="modal-title-wrap">
                        <div className="modal-icon-badge">
                            {initialPerson ? <UserCheck size={20}/> : <UserPlus size={20}/>}
                        </div>
                        <h3>{initialPerson ? t('person.edit') : t('person.add')}</h3>
                    </div>
                    <button type="button" className="modal-close-btn" onClick={onClose}>
                        <X size={20}/>
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="modal-body-form">
                    {error && <div className="modal-error-banner">{error}</div>}

                    <div className="form-group">
                        <label htmlFor="displayName">{t('person.name')} *</label>
                        <input
                            id="displayName"
                            type="text"
                            className="form-input"
                            placeholder={t('person.namePlaceholder')}
                            value={displayName}
                            onChange={(e) => setDisplayName(e.target.value)}
                            required
                            autoFocus
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="birthDate">{t('person.birthDate')}</label>
                        <input
                            id="birthDate"
                            type="date"
                            className="form-input"
                            value={birthDate}
                            onChange={(e) => setBirthDate(e.target.value)}
                        />
                    </div>

                    <div className="form-group">
                        <label>{t('person.gender')}</label>
                        <div className="gender-segmented-control">
                            <button
                                type="button"
                                className={`segmented-btn ${gender === 'MALE' ? 'active male' : ''}`}
                                onClick={() => setGender('MALE')}
                            >
                                {t('person.male')}
                            </button>
                            <button
                                type="button"
                                className={`segmented-btn ${gender === 'FEMALE' ? 'active female' : ''}`}
                                onClick={() => setGender('FEMALE')}
                            >
                                {t('person.female')}
                            </button>
                            <button
                                type="button"
                                className={`segmented-btn ${gender === 'OTHER' ? 'active other' : ''}`}
                                onClick={() => setGender('OTHER')}
                            >
                                {t('person.other')}
                            </button>
                        </div>
                    </div>

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
                            {loading ? t('person.saving') : initialPerson ? t('person.save') : t('person.create')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    )
}
