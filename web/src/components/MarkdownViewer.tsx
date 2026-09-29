import {type MouseEvent, useMemo, useRef} from 'react'
import {useNavigate} from 'react-router-dom'
import {Marked, type Token} from 'marked'
import Prism from 'prismjs'
import {useI18n} from '../context/I18nContext'
import 'prismjs/components/prism-bash'
import 'prismjs/components/prism-json'
import 'prismjs/components/prism-yaml'
import 'prismjs/components/prism-java'
import 'prismjs/components/prism-sql'
import 'prismjs/components/prism-docker'
import 'prismjs/components/prism-nginx'
import 'prismjs/components/prism-ini'
import 'prismjs/components/prism-typescript'

// Map language aliases
Prism.languages.sh = Prism.languages.bash
Prism.languages.shell = Prism.languages.bash
Prism.languages.dotenv = Prism.languages.ini || Prism.languages.bash
Prism.languages.env = Prism.languages.ini || Prism.languages.bash
Prism.languages.yml = Prism.languages.yaml
Prism.languages.ts = Prism.languages.typescript
Prism.languages.js = Prism.languages.javascript

export function slugify(value: string) {
    return value
        .toLocaleLowerCase('it')
        .normalize('NFKD')
        .replace(/[\u0300-\u036f]/g, '')
        .replace(/[^a-z0-9\s-]/g, '')
        .trim()
        .replace(/\s+/g, '-')
}

function escapeHtml(text: string): string {
    return text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#39;')
}

function resolveDocHref(href: string): { path: string; isExternal: boolean; isAnchor: boolean } {
    if (/^https?:\/\//i.test(href) || href.startsWith('mailto:')) {
        return {path: href, isExternal: true, isAnchor: false}
    }
    if (href.startsWith('#')) {
        return {path: href, isExternal: false, isAnchor: true}
    }
    const cleanHref = href.replace(/\.(md|docs)$/i, '')
    const docMatch = /(?:^|\/|\.\.\/)(README|DEVELOPMENT|USER_GUIDE|overview|development|user-guide)(?:\.en)?(#.*)?$/i.exec(cleanHref)
    if (docMatch) {
        const file = docMatch[1].toLowerCase()
        const hash = docMatch[2] ?? ''
        let slug = 'overview'
        if (file.includes('development')) slug = 'development'
        else if (file.includes('user_guide') || file.includes('user-guide')) slug = 'user-guide'
        return {path: `/documentation/${slug}${hash}`, isExternal: false, isAnchor: false}
    }
    return {path: href, isExternal: false, isAnchor: false}
}

const ALERT_CONFIG: Record<
    string,
    { labelKey: string; iconSvg: string }
> = {
    note: {
        labelKey: 'docs.alert.note',
        iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>`,
    },
    tip: {
        labelKey: 'docs.alert.tip',
        iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>`,
    },
    important: {
        labelKey: 'docs.alert.important',
        iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 8v4"/><path d="M12 16h.01"/></svg>`,
    },
    warning: {
        labelKey: 'docs.alert.warning',
        iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`,
    },
    caution: {
        labelKey: 'docs.alert.caution',
        iconSvg: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="7.86 2 16.14 2 22 7.86 22 16.14 16.14 22 7.86 22 2 16.14 2 7.86 7.86 2"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>`,
    },
}

const COPY_ICON_SVG = `<svg class="copy-icon-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`
const CHECK_ICON_SVG = `<svg class="copy-icon-svg" width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`

interface MarkdownViewerProps {
    content: string
}

export function MarkdownViewer({content}: MarkdownViewerProps) {
    const containerRef = useRef<HTMLDivElement>(null)
    const navigate = useNavigate()
    const {t} = useI18n()

    const html = useMemo(() => {
        const parserInstance = new Marked({
            gfm: true,
            breaks: false,
        })

        parserInstance.use({
            renderer: {
                heading(token) {
                    const raw = token.text
                    const plain = raw.replace(/<[^>]*>/g, '')
                    const id = slugify(plain)
                    const renderedContent = this.parser.parseInline(token.tokens)
                    return `<h${token.depth} id="${id}" class="docs-heading">
  <a href="#${id}" class="docs-heading-anchor" aria-label="${escapeHtml(t('docs.linkToHeading', {title: plain}))}">#</a>
  <span>${renderedContent}</span>
</h${token.depth}>\n`
                },
                link(token) {
                    const resolved = resolveDocHref(token.href)
                    const text = this.parser.parseInline(token.tokens)
                    const title = token.title ? ` title="${escapeHtml(token.title)}"` : ''
                    if (resolved.isExternal) {
                        return `<a href="${escapeHtml(resolved.path)}" target="_blank" rel="noopener noreferrer"${title}>${text}</a>`
                    }
                    return `<a href="${escapeHtml(resolved.path)}"${title}>${text}</a>`
                },
                code(token) {
                    const lang = (token.lang || '').trim().toLowerCase()
                    const code = token.text
                    const grammar = lang && Prism.languages[lang] ? Prism.languages[lang] : null
                    const highlighted = grammar ? Prism.highlight(code, grammar, lang) : escapeHtml(code)
                    const encoded = encodeURIComponent(code)
                    const displayLang = lang || 'text'
                    const copyLabel = t('docs.copyCode')

                    return `<div class="docs-code-container" data-raw-code="${encoded}">
  <div class="docs-code-bar">
    <span class="docs-code-language">${escapeHtml(displayLang)}</span>
    <button type="button" class="docs-code-copy-btn" aria-label="${copyLabel} code" title="${copyLabel}">
      ${COPY_ICON_SVG}
      <span class="copy-text">${copyLabel}</span>
    </button>
  </div>
  <pre class="language-${escapeHtml(displayLang)}"><code class="language-${escapeHtml(displayLang)}">${highlighted}</code></pre>
</div>\n`
                },
                blockquote(token) {
                    const tokensList = token.tokens as (Token & { tokens?: Token[] })[]
                    const firstToken = tokensList?.[0]
                    if (firstToken && 'text' in firstToken && typeof firstToken.text === 'string') {
                        const match = firstToken.text.match(/^\s*\[!(NOTE|TIP|IMPORTANT|WARNING|CAUTION)\]\s*(.*)/i)
                        if (match) {
                            const type = match[1].toLowerCase()
                            const rest = match[2]
                            if (rest) {
                                firstToken.text = rest
                                if (firstToken.tokens && firstToken.tokens[0] && 'text' in firstToken.tokens[0]) {
                                    firstToken.tokens[0].text = rest
                                }
                            } else {
                                tokensList.shift()
                            }
                            const cfg = ALERT_CONFIG[type] ?? ALERT_CONFIG.note
                            const label = t(cfg.labelKey)
                            const body = this.parser.parse(tokensList)
                            return `<div class="docs-alert docs-alert-${type}">
  <div class="docs-alert-header">
    <span class="docs-alert-icon">${cfg.iconSvg}</span>
    <span class="docs-alert-title">${label}</span>
  </div>
  <div class="docs-alert-body">${body}</div>
</div>\n`
                        }
                    }
                    return `<blockquote>${this.parser.parse(token.tokens)}</blockquote>\n`
                },
                table(token) {
                    let header = ''
                    for (let i = 0; i < token.header.length; i++) {
                        header += this.tablecell(token.header[i])
                    }
                    let rows = ''
                    for (let i = 0; i < token.rows.length; i++) {
                        let rowCells = ''
                        for (let j = 0; j < token.rows[i].length; j++) {
                            rowCells += this.tablecell(token.rows[i][j])
                        }
                        rows += this.tablerow({text: rowCells})
                    }
                    return `<div class="docs-table-wrap"><table>
<thead>${this.tablerow({text: header})}</thead>
<tbody>${rows}</tbody>
</table></div>\n`
                },
            },
        })

        const parsed = parserInstance.parse(content)
        return typeof parsed === 'string' ? parsed : ''
    }, [content, t])

    const handleClick = (e: MouseEvent<HTMLDivElement>) => {
        // 1. Handle Copy Code Button
        const copyBtn = (e.target as HTMLElement).closest('.docs-code-copy-btn') as HTMLButtonElement | null
        if (copyBtn) {
            e.preventDefault()
            e.stopPropagation()
            const container = copyBtn.closest('.docs-code-container') as HTMLElement | null
            const raw = container?.dataset.rawCode
            if (raw) {
                const rawCode = decodeURIComponent(raw)
                void navigator.clipboard.writeText(rawCode).then(() => {
                    copyBtn.classList.add('copied')
                    copyBtn.innerHTML = `${CHECK_ICON_SVG}<span class="copy-text">${t('docs.copied')}</span>`
                    setTimeout(() => {
                        copyBtn.classList.remove('copied')
                        copyBtn.innerHTML = `${COPY_ICON_SVG}<span class="copy-text">${t('docs.copy')}</span>`
                    }, 2000)
                })
            }
            return
        }

        // 2. Handle Anchor and Internal Documentation Links
        const anchor = (e.target as HTMLElement).closest('a') as HTMLAnchorElement | null
        if (!anchor) return

        const href = anchor.getAttribute('href')
        if (!href) return

        // In-page hash jump
        if (href.startsWith('#')) {
            e.preventDefault()
            const targetId = href.slice(1)
            const targetEl = document.getElementById(targetId)
            if (targetEl) {
                targetEl.scrollIntoView({behavior: 'smooth'})
                window.history.pushState(null, '', href)
            }
            return
        }

        // Internal documentation route jump
        if (href.startsWith('/documentation')) {
            e.preventDefault()
            navigate(href)
            const hashIndex = href.indexOf('#')
            if (hashIndex !== -1) {
                const targetId = href.slice(hashIndex + 1)
                setTimeout(() => {
                    document.getElementById(targetId)?.scrollIntoView({behavior: 'smooth'})
                }, 100)
            } else {
                window.scrollTo({top: 0, behavior: 'smooth'})
            }
        }
    }

    return (
        <div
            ref={containerRef}
            className="docs-markdown"
            onClick={handleClick}
            dangerouslySetInnerHTML={{__html: html}}
        />
    )
}
