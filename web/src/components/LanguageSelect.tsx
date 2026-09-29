import {type KeyboardEvent, useEffect, useMemo, useRef, useState} from 'react'
import {useI18n} from '../context/I18nContext'
import {ExpandMore, Languages} from './GoogleIcon'

interface LanguageSelectProps {
    className?: string
}

export function LanguageSelect({className}: LanguageSelectProps) {
    const {language, availableLanguages, setLanguage, t} = useI18n()
    const [open, setOpen] = useState(false)
    const containerRef = useRef<HTMLDivElement>(null)
    const optionRefs = useRef<Array<HTMLButtonElement | null>>([])
    const languageNames = useMemo(
        () => new Intl.DisplayNames([language], {type: 'language'}),
        [language],
    )

    useEffect(() => {
        if (!open) return
        optionRefs.current[availableLanguages.indexOf(language)]?.focus()
        const closeOnOutsideClick = (event: PointerEvent) => {
            if (!containerRef.current?.contains(event.target as Node)) setOpen(false)
        }
        document.addEventListener('pointerdown', closeOnOutsideClick)
        return () => document.removeEventListener('pointerdown', closeOnOutsideClick)
    }, [open, language, availableLanguages])

    const chooseLanguage = (selectedLanguage: typeof language) => {
        setLanguage(selectedLanguage)
        setOpen(false)
    }

    const handleOptionKeyDown = (event: KeyboardEvent<HTMLButtonElement>, index: number) => {
        let nextIndex: number | undefined
        if (event.key === 'ArrowDown') nextIndex = (index + 1) % availableLanguages.length
        if (event.key === 'ArrowUp') nextIndex = (index - 1 + availableLanguages.length) % availableLanguages.length
        if (event.key === 'Home') nextIndex = 0
        if (event.key === 'End') nextIndex = availableLanguages.length - 1
        if (nextIndex !== undefined) {
            event.preventDefault()
            optionRefs.current[nextIndex]?.focus()
        } else if (event.key === 'Escape') {
            event.preventDefault()
            setOpen(false)
        } else if (event.key === 'Tab') {
            setOpen(false)
        }
    }

    return (
        <div ref={containerRef} className={`docs-language-select${className ? ` ${className}` : ''}`}>
            <button
                type="button"
                className="docs-language-trigger"
                aria-label={t('settings.language')}
                aria-haspopup="listbox"
                aria-expanded={open}
                onClick={() => setOpen((current) => !current)}
                onKeyDown={(event) => {
                    if (event.key === 'ArrowDown' || event.key === 'Enter' || event.key === ' ') {
                        event.preventDefault()
                        setOpen(true)
                    }
                }}
            >
                <Languages size={18} className="docs-lang-icon"/>
                <span className="docs-language-label">{t('settings.language')}</span>
                <span className="docs-language-current">{languageNames.of(language) ?? language}</span>
                <ExpandMore size={18} className="docs-language-chevron"/>
            </button>
            {open && (
                <div className="docs-language-menu" role="listbox" aria-label={t('settings.language')}>
                    {availableLanguages.map((availableLanguage, index) => (
                        <button
                            key={availableLanguage}
                            ref={(element) => {
                                optionRefs.current[index] = element
                            }}
                            type="button"
                            role="option"
                            aria-selected={availableLanguage === language}
                            className={`docs-language-option${availableLanguage === language ? ' selected' : ''}`}
                            onClick={() => chooseLanguage(availableLanguage)}
                            onKeyDown={(event) => handleOptionKeyDown(event, index)}
                        >
                            <span>{languageNames.of(availableLanguage) ?? availableLanguage}</span>
                            {availableLanguage === language &&
                                <span aria-hidden="true" className="docs-language-check">✓</span>}
                        </button>
                    ))}
                </div>
            )}
        </div>
    )
}
