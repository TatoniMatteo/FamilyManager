export function getAvatarForPerson(name: string, gender?: string): string {
    const initial = name.trim().charAt(0).toLocaleUpperCase() || '?'
    const fill = gender?.toUpperCase() === 'FEMALE' ? '#ffe4e6' : gender?.toUpperCase() === 'MALE' ? '#e0f2fe' : '#e2e8f0'
    const color = gender?.toUpperCase() === 'FEMALE' ? '#be123c' : gender?.toUpperCase() === 'MALE' ? '#0369a1' : '#475569'
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 80"><rect width="80" height="80" rx="40" fill="${fill}"/><text x="40" y="53" text-anchor="middle" font-family="sans-serif" font-size="36" font-weight="600" fill="${color}">${initial}</text></svg>`
    return `data:image/svg+xml,${encodeURIComponent(svg)}`
}

export function getGenderCategory(gender?: string): 'maschio' | 'femmina' | 'altro' {
    const value = gender?.toUpperCase()
    if (value === 'MALE' || value === 'M' || value === 'MASCHIO') return 'maschio'
    if (value === 'FEMALE' || value === 'F' || value === 'FEMMINA') return 'femmina'
    return 'altro'
}
