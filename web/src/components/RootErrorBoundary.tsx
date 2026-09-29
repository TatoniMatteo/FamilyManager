import {Component, type ErrorInfo, type ReactNode} from 'react'

interface State {
    hasError: boolean;
    errorId: string
}

function createErrorId() {
    return globalThis.crypto?.randomUUID?.() ?? Math.random().toString(36).slice(2, 12)
}

export class RootErrorBoundary extends Component<{ children: ReactNode }, State> {
    state: State = {hasError: false, errorId: ''}

    static getDerivedStateFromError(): State {
        return {hasError: true, errorId: createErrorId()}
    }

    componentDidCatch(error: Error, info: ErrorInfo) {
        console.error('Errore non gestito nell’interfaccia', {
            errorId: this.state.errorId,
            error,
            componentStack: info.componentStack
        })
    }

    render() {
        if (this.state.hasError) {
            return <main className="system-status-page" role="alert">
                <section className="system-status-card">
                    <img className="system-status-logo" src="/logo.svg" alt="FamilyManager"/>
                    <p className="section-eyebrow">Errore</p><h1>La pagina non è disponibile</h1>
                    <p>Si è verificato un errore inatteso. Ricarica la pagina per riprovare.</p>
                    <button className="btn btn-primary" onClick={() => window.location.reload()}>Ricarica</button>
                    <small>Codice: {this.state.errorId}</small>
                </section>
            </main>
        }
        return this.props.children
    }
}
