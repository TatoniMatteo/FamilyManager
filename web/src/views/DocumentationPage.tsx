import {useEffect, useMemo, useRef, useState} from 'react'
import {Link, NavLink, useParams} from 'react-router-dom'

// IT Overview chapters
import itOverview01 from '../../../docs/it/overview/01-introduzione.docs?raw'
import itOverview02 from '../../../docs/it/overview/02-struttura-guide.docs?raw'

// IT Development chapters
import itDev01 from '../../../docs/it/development/01-architettura.docs?raw'
import itDev02 from '../../../docs/it/development/02-prerequisiti-e-docker.docs?raw'
import itDev03 from '../../../docs/it/development/03-configurazione.docs?raw'
import itDev04 from '../../../docs/it/development/04-google-oauth.docs?raw'
import itDev05 from '../../../docs/it/development/05-sviluppo-frontend.docs?raw'

// IT User Guide chapters
import itUser01 from '../../../docs/it/user-guide/01-accesso-e-account.docs?raw'
import itUser02 from '../../../docs/it/user-guide/02-famiglia-e-albero.docs?raw'
import itUser03 from '../../../docs/it/user-guide/03-nuclei-familiari.docs?raw'
import itUser04 from '../../../docs/it/user-guide/04-impostazioni-e-amministrazione.docs?raw'
import itUser05 from '../../../docs/it/user-guide/05-funzionalita-e-manutenzione.docs?raw'

// EN Overview chapters
import enOverview01 from '../../../docs/en/overview/01-introduction.docs?raw'
import enOverview02 from '../../../docs/en/overview/02-guide-structure.docs?raw'

// EN Development chapters
import enDev01 from '../../../docs/en/development/01-architecture.docs?raw'
import enDev02 from '../../../docs/en/development/02-prerequisites-and-docker.docs?raw'
import enDev03 from '../../../docs/en/development/03-configuration.docs?raw'
import enDev04 from '../../../docs/en/development/04-google-oauth.docs?raw'
import enDev05 from '../../../docs/en/development/05-frontend-development.docs?raw'

// EN User Guide chapters
import enUser01 from '../../../docs/en/user-guide/01-sign-in-and-accounts.docs?raw'
import enUser02 from '../../../docs/en/user-guide/02-family-and-tree.docs?raw'
import enUser03 from '../../../docs/en/user-guide/03-households.docs?raw'
import enUser04 from '../../../docs/en/user-guide/04-settings-and-administration.docs?raw'
import enUser05 from '../../../docs/en/user-guide/05-features-and-maintenance.docs?raw'

import {type Language, useI18n} from '../context/I18nContext'
import {MarkdownViewer} from '../components/MarkdownViewer'
import {Home} from '../components/GoogleIcon'
import {LanguageSelect} from '../components/LanguageSelect'

interface Chapter {
    id: string
    content: Record<Language, string>
    hasArchitectureDiagram?: boolean
}

interface DocSection {
    slug: string
    chapters: Chapter[]
}

interface TocItem {
    id: string
    title: string
    level: number
}

const docSections: DocSection[] = [
    {
        slug: 'overview',
        chapters: [
            {
                id: 'introduzione',
                content: {it: itOverview01, en: enOverview01},
            },
            {
                id: 'struttura-delle-guide',
                content: {it: itOverview02, en: enOverview02},
            },
        ],
    },
    {
        slug: 'development',
        chapters: [
            {
                id: 'architettura-del-sistema',
                content: {it: itDev01, en: enDev01},
                hasArchitectureDiagram: true,
            },
            {
                id: 'prerequisiti-e-avvio-con-docker',
                content: {it: itDev02, en: enDev02},
            },
            {
                id: 'file-di-configurazione-e-variabili',
                content: {it: itDev03, en: enDev03},
            },
            {
                id: 'configurare-google-oauth',
                content: {it: itDev04, en: enDev04},
            },
            {
                id: 'sviluppo-frontend',
                content: {it: itDev05, en: enDev05},
            },
        ],
    },
    {
        slug: 'user-guide',
        chapters: [
            {
                id: 'accesso-e-gestione-account',
                content: {it: itUser01, en: enUser01},
            },
            {
                id: 'famiglia-e-albero-genealogico',
                content: {it: itUser02, en: enUser02},
            },
            {
                id: 'nuclei-familiari',
                content: {it: itUser03, en: enUser03},
            },
            {
                id: 'impostazioni-e-amministrazione',
                content: {it: itUser04, en: enUser04},
            },
            {
                id: 'funzionalita-pianificate-e-stato-del-sistema',
                content: {it: itUser05, en: enUser05},
            },
        ],
    },
]

function ArchitectureDiagram() {
    const {t} = useI18n()
    return (
        <figure
            className="docs-architecture-diagram"
            aria-label={t('docs.architectureAria')}
        >
            <div className="docs-diagram-client">
                Browser<small>React &middot; TypeScript</small>
            </div>
            <div className="docs-diagram-connector">
                <span>HTTPS</span>
                <i/>
            </div>
            <div className="docs-diagram-proxy">
                Nginx<small>TLS &middot; static site &middot; reverse proxy</small>
            </div>
            <div className="docs-diagram-branches">
                <div className="docs-diagram-branch">
                    <span>/api &middot; OAuth</span>
                    <i/>
                    <div className="docs-diagram-service">
                        Core<small>Spring Boot &middot; Java 25</small>
                    </div>
                    <i/>
                    <div className="docs-diagram-service">
                        PostgreSQL<small>{t('docs.familyData')}</small>
                    </div>
                </div>
                <div className="docs-diagram-branch">
                    <span>/mailpit</span>
                    <i/>
                    <div className="docs-diagram-service">
                        Mailpit<small>{t('docs.localEmailPreview')}</small>
                    </div>
                </div>
            </div>
            <figcaption>
                {t('docs.architectureCaption')}
            </figcaption>
        </figure>
    )
}

export function DocumentationPage() {
    const {page: requestedPage} = useParams()
    const {language, t} = useI18n()

    const activeSlug = requestedPage ?? 'overview'
    const section = docSections.find((entry) => entry.slug === activeSlug)

    const contentContainerRef = useRef<HTMLDivElement>(null)
    const [headings, setHeadings] = useState<TocItem[]>([])
    const [activeHeadingId, setActiveHeadingId] = useState<string>('')

    // Combined content for the section
    const combinedMarkdown = useMemo(() => {
        if (!section) return ''
        return section.chapters
            .map((ch) => ch.content[language])
            .join('\n\n')
    }, [section, language])

    // Extract headings (H2, H3) for the Table of Contents (Sommario)
    useEffect(() => {
        if (!contentContainerRef.current) return

        // Small delay to let the markdown parse and render into the DOM
        const timer = setTimeout(() => {
            if (!contentContainerRef.current) return
            const elements = contentContainerRef.current.querySelectorAll<HTMLElement>('h2, h3')
            const items: TocItem[] = []

            elements.forEach((el) => {
                const id = el.id
                const title = el.querySelector('span')?.textContent || el.textContent || ''
                const level = parseInt(el.tagName.replace('H', ''), 10) || 2
                if (id && title) {
                    items.push({id, title: title.replace(/^#\s*/, ''), level})
                }
            })

            setHeadings(items)
            if (items.length > 0 && !activeHeadingId) {
                setActiveHeadingId(items[0].id)
            }
        }, 50)

        return () => clearTimeout(timer)
    }, [combinedMarkdown, requestedPage])

    // Track active heading on scroll
    useEffect(() => {
        if (headings.length === 0) return

        const handleScroll = () => {
            const offset = 110 // Topbar height + padding
            const scrollY = window.scrollY

            let currentId = headings[0]?.id ?? ''
            for (const h of headings) {
                const el = document.getElementById(h.id)
                if (el) {
                    const top = el.getBoundingClientRect().top + scrollY - offset
                    if (scrollY >= top) {
                        currentId = h.id
                    }
                }
            }
            setActiveHeadingId(currentId)
        }

        window.addEventListener('scroll', handleScroll, {passive: true})
        handleScroll()
        return () => window.removeEventListener('scroll', handleScroll)
    }, [headings])

    const scrollToHeading = (id: string, e: React.MouseEvent) => {
        e.preventDefault()
        const el = document.getElementById(id)
        if (el) {
            el.scrollIntoView({behavior: 'smooth'})
            window.history.pushState(null, '', `#${id}`)
            setActiveHeadingId(id)
        }
    }

    return (
        <div className="documentation-site">
            {/* Fixed Sticky Navbar */}
            <header className="docs-header">
                <Link className="docs-brand" to="/documentation">
                    <img src="/logo.svg" alt=""/>
                    <span>
            FamilyManager <small>{t('docs.documentation')}</small>
          </span>
                </Link>
                <div className="docs-header-actions">
                    <LanguageSelect/>
                    <Link
                        className="docs-back-link"
                        to="/"
                        aria-label={t('docs.backToApp')}
                        data-tooltip={t('docs.backToApp')}
                    >
                        <Home size={20}/>
                    </Link>
                </div>
            </header>

            <div className="docs-layout">
                {/* Left Navigation: Sections & Chapter index */}
                <nav
                    className="docs-navigation"
                    aria-label={t('docs.navigationAria')}
                >
                    <p className="docs-navigation-heading">
                        {t('docs.documentation')}
                    </p>
                    {docSections.map((entry) => {
                        const isCurrent =
                            entry.slug === activeSlug ||
                            (!requestedPage && entry.slug === 'overview')
                        return (
                            <div key={entry.slug} className="docs-nav-group">
                                <NavLink
                                    to={`/documentation/${entry.slug}`}
                                    className={() =>
                                        `docs-navigation-link${isCurrent ? ' active' : ''}`
                                    }
                                >
                                    {t(`docs.section.${entry.slug}`)}
                                </NavLink>
                                {/* Chapters list under current section */}
                                {isCurrent && entry.chapters.length > 0 && (
                                    <ul className="docs-chapter-list">
                                        {entry.chapters.map((ch) => (
                                            <li key={ch.id}>
                                                <a
                                                    href={`#${ch.id}`}
                                                    className={`docs-chapter-link ${activeHeadingId === ch.id ? 'current' : ''}`}
                                                    onClick={(e) => scrollToHeading(ch.id, e)}
                                                >
                                                    {t(`docs.chapter.${ch.id}`)}
                                                </a>
                                            </li>
                                        ))}
                                    </ul>
                                )}
                            </div>
                        )
                    })}

                    <p className="docs-navigation-note">
                        {t('docs.multiChapterGuides')}
                    </p>
                </nav>

                {/* Center Main Content */}
                <main className="docs-main" ref={contentContainerRef}>
                    {section ? (
                        <>
                            <p className="docs-eyebrow">
                                FamilyManager &middot; {t(`docs.section.${section.slug}`)}
                            </p>

                            {/* Render chapters in sequence */}
                            {section.chapters.map((chapter, index) => (
                                <article
                                    key={chapter.id}
                                    id={chapter.id}
                                    className={`docs-chapter-article ${index > 0 ? 'docs-chapter-separator' : ''}`}
                                >
                                    <MarkdownViewer
                                        content={chapter.content[language]}
                                    />
                                    {chapter.hasArchitectureDiagram && (
                                        <ArchitectureDiagram/>
                                    )}
                                </article>
                            ))}

                            <footer className="docs-page-footer">
                <span>
                  {t('docs.updatedAlongside')}
                </span>
                                <span lang={language}>
                  {t('docs.projectDocumentation')}
                </span>
                            </footer>
                        </>
                    ) : (
                        <section className="docs-not-found">
                            <h1>{t('docs.pageNotFound')}</h1>
                            <p>{t('docs.guideNotExist')}</p>
                            <Link to="/documentation/overview">
                                {t('docs.openOverview')}
                            </Link>
                        </section>
                    )}
                </main>

                {/* Right Sidebar: Table of Contents (Sommario) */}
                <aside
                    className="docs-toc"
                    aria-label={t('docs.tocAria')}
                >
                    <div className="docs-toc-inner">
                        <p className="docs-toc-title">
                            <svg
                                width="15"
                                height="15"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                            >
                                <line x1="8" y1="6" x2="21" y2="6"/>
                                <line x1="8" y1="12" x2="21" y2="12"/>
                                <line x1="8" y1="18" x2="21" y2="18"/>
                                <line x1="3" y1="6" x2="3.01" y2="6"/>
                                <line x1="3" y1="12" x2="3.01" y2="12"/>
                                <line x1="3" y1="18" x2="3.01" y2="18"/>
                            </svg>
                            <span>{t('docs.onThisPage')}</span>
                        </p>
                        {headings.length > 0 ? (
                            <ul className="docs-toc-list">
                                {headings.map((h) => (
                                    <li key={h.id} className={`docs-toc-item level-${h.level}`}>
                                        <a
                                            href={`#${h.id}`}
                                            className={`docs-toc-link ${activeHeadingId === h.id ? 'active' : ''}`}
                                            onClick={(e) => scrollToHeading(h.id, e)}
                                        >
                                            {h.title}
                                        </a>
                                    </li>
                                ))}
                            </ul>
                        ) : (
                            <p className="docs-toc-empty">
                                {t('docs.noSections')}
                            </p>
                        )}
                    </div>
                </aside>
            </div>
        </div>
    )
}
