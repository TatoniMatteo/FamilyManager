import type {
    CreatePersonRequest,
    CreateRelationshipRequest,
    PersonResponse,
    RelationshipResponse,
    UpdatePersonRequest
} from './models'
import type {HouseholdResponse} from './models/householdResponse'

export type Person = PersonResponse
export type Relationship = RelationshipResponse

export interface PersonWithRelations extends Person {
    ancestors?: Person[]
    descendants?: Person[]
    siblings?: Person[]
}

export class ApiError extends Error {
    constructor(
        message: string,
        readonly status: number,
        readonly code: string,
        readonly errorId?: string,
        readonly retryable = false,
    ) {
        super(message)
        this.name = 'ApiError'
    }
}

function signalServiceUnavailable() {
    if (typeof window !== 'undefined') window.dispatchEvent(new Event('familymanager:service-unavailable'))
}

async function errorFromResponse(response: Response): Promise<ApiError> {
    let payload: Record<string, unknown> = {}
    try {
        const body = await response.text()
        if (body) {
            const parsed: unknown = JSON.parse(body)
            if (parsed && typeof parsed === 'object') payload = parsed as Record<string, unknown>
        }
    } catch { /* Responses from a proxy may be HTML or empty. */
    }

    const unavailable = [502, 503, 504].includes(response.status)
    if (unavailable) signalServiceUnavailable()
    const message = typeof payload.message === 'string'
        ? payload.message
        : unavailable
            ? 'Il servizio non è al momento disponibile.'
            : `Richiesta non riuscita (${response.status}).`
    return new ApiError(message, response.status,
        typeof payload.code === 'string' ? payload.code : unavailable ? 'SERVICE_UNAVAILABLE' : `HTTP_${response.status}`,
        typeof payload.errorId === 'string' ? payload.errorId : undefined,
        unavailable)
}

async function request<T>(url: string, options?: RequestInit): Promise<T> {
    const method = options?.method?.toUpperCase() ?? 'GET'
    const headers: Record<string, string> = {Accept: 'application/json', 'Content-Type': 'application/json'}
    try {
        if (!['GET', 'HEAD', 'OPTIONS'].includes(method)) {
            const csrfResponse = await fetch('/api/auth/csrf', {
                credentials: 'same-origin', headers: {Accept: 'application/json'}, signal: AbortSignal.timeout(10_000),
            })
            if (!csrfResponse.ok) {
                throw await errorFromResponse(csrfResponse)
            }
            const csrf = await csrfResponse.json() as { token?: string }
            if (!csrf.token) {
                throw new ApiError('Non è stato possibile inizializzare la richiesta sicura.', 503, 'CSRF_UNAVAILABLE', undefined, true)
            }
            headers['X-XSRF-TOKEN'] = csrf.token
        }
        Object.assign(headers, options?.headers)
        const response = await fetch(url, {
            ...options,
            credentials: 'same-origin',
            headers,
            signal: options?.signal ?? AbortSignal.timeout(15_000)
        })
        if (!response.ok) {
            throw await errorFromResponse(response)
        }
        if (response.status === 204 || response.headers.get('content-length') === '0') {
            return null as T
        }

        const contentType = response.headers.get('content-type') ?? ''
        if (!contentType.includes('application/json')) {
            throw new ApiError('La risposta del servizio non è nel formato previsto.', response.status, 'INVALID_RESPONSE')
        }
        return await response.json() as T
    } catch (cause) {
        if (cause instanceof ApiError) {
            if (cause.retryable) signalServiceUnavailable()
            throw cause
        }
        if (cause instanceof DOMException && cause.name === 'AbortError') {
            throw cause
        }
        if (cause instanceof TypeError || cause instanceof DOMException) {
            signalServiceUnavailable()
            throw new ApiError('Impossibile raggiungere il servizio. Controlla la connessione e riprova.', 503, 'NETWORK_ERROR', undefined, true)
        }
        signalServiceUnavailable()
        throw new ApiError('La risposta del servizio non è leggibile.', 502, 'INVALID_RESPONSE', undefined, true)
    }
}

export const api = {
    auth: {
        status: () => request<{ bootstrapRequired: boolean }>('/api/auth/status'),
        googleStatus: () => request<{ enabled: boolean }>('/api/auth/google/status'),
        invitation: (token: string) => request<{
            email: string;
            type: string;
            expiresAt: string
        }>(`/api/auth/invitation?token=${encodeURIComponent(token)}`),
        prepareGoogleInvitation: (invitationToken: string) => request<{
            authorizationUrl: string
        }>('/api/auth/google/invitation', {
            method: 'POST', body: JSON.stringify({invitationToken}),
        }),
        beginGoogleLink: () => request<{ authorizationUrl: string }>('/api/auth/google/link', {method: 'POST'}),
        me: () => request<AuthAccount>('/api/auth/me'),
        register: (email: string, password: string, invitationToken?: string) => request<{
            status: string
        }>('/api/auth/register', {
            method: 'POST', body: JSON.stringify({email, password, invitationToken}),
        }),
        verifyEmail: (token: string) => request<{
            status: string;
            initialAdmin: string;
            profileComplete: string
        }>('/api/auth/verify-email', {
            method: 'POST', body: JSON.stringify({token}),
        }),
        login: (email: string, password: string) => request<AuthAccount>('/api/auth/login', {
            method: 'POST', body: JSON.stringify({email, password}),
        }),
        logout: () => request<void>('/api/auth/logout', {method: 'POST'}),
        requestPasswordReset: (email: string) => request<{ status: string }>('/api/auth/password/reset-request', {
            method: 'POST', body: JSON.stringify({email}),
        }),
        resetPassword: (token: string, password: string) => request<void>('/api/auth/password/reset', {
            method: 'POST', body: JSON.stringify({token, password}),
        }),
        setupPassword: (token: string, password: string) => request<{ status: string }>('/api/auth/password/setup', {
            method: 'POST', body: JSON.stringify({token, password}),
        }),
        setupGooglePassword: (password: string) => request<{ status: string }>('/api/auth/google/password-setup', {
            method: 'POST', body: JSON.stringify({password}),
        }),
        createProfile: (data: { firstName: string; lastName: string; birthDate: string; gender: string }) =>
            request<PersonResponse>('/api/auth/profile', {method: 'POST', body: JSON.stringify(data)}),
        deleteAccount: () => request<void>('/api/auth/account', {method: 'DELETE'}),
    },
    admin: {
        pendingAccounts: () => request<PendingAccount[]>('/api/admin/accounts/pending'),
        activeAccounts: () => request<Array<{ id: string; email: string; role: string }>>('/api/admin/accounts/active'),
        transferAdministrator: (accountId: string) => request<void>('/api/admin/accounts/transfer-administrator', {
            method: 'POST', body: JSON.stringify({accountId}),
        }),
        availableProfiles: () => request<Array<{
            id: string;
            displayName: string
        }>>('/api/admin/accounts/available-profiles'),
        approveAccount: (id: string, assignment: { personId?: string; displayName?: string }) =>
            request<{ accountId: string; status: string; personId: string }>(`/api/admin/accounts/${id}/approve`, {
                method: 'POST', body: JSON.stringify(assignment),
            }),
        invitations: () => request<InvitationSummary[]>('/api/admin/invitations'),
        createInvitation: (data: { email: string; type: string; personId?: string; expiresInHours: number }) =>
            request<{ id: string; email: string; url: string; expiresAt: string }>('/api/admin/invitations', {
                method: 'POST', body: JSON.stringify(data),
            }),
    },
    persons: {
        list: () => request<PersonResponse[]>('/api/persons'),
        get: (id: string) => request<PersonResponse>(`/api/persons/${id}`),
        create: (data: CreatePersonRequest) =>
            request<PersonResponse>('/api/persons', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
        update: (id: string, data: UpdatePersonRequest) =>
            request<PersonResponse>(`/api/persons/${id}`, {
                method: 'PATCH',
                body: JSON.stringify(data),
            }),
        delete: (id: string) =>
            request<void>(`/api/persons/${id}`, {
                method: 'DELETE',
            }),
        ancestors: (id: string) =>
            request<PersonResponse[]>(`/api/persons/${id}/ancestors`),
        descendants: (id: string) =>
            request<PersonResponse[]>(`/api/persons/${id}/descendants`),
        siblings: (id: string) =>
            request<PersonResponse[]>(`/api/persons/${id}/siblings`),
    },
    relationships: {
        list: () => request<RelationshipResponse[]>('/api/relationships'),
        create: (data: CreateRelationshipRequest) =>
            request<RelationshipResponse>('/api/relationships', {
                method: 'POST',
                body: JSON.stringify(data),
            }),
    },
    households: {
        list: () => request<HouseholdResponse[]>('/api/households'),
        create: (name: string) => request<HouseholdResponse>('/api/households', {
            method: 'POST', body: JSON.stringify({name}),
        }),
        rename: (householdId: string, name: string) => request<HouseholdResponse>(`/api/households/${householdId}`, {
            method: 'PATCH', body: JSON.stringify({name}),
        }),
        addMember: (householdId: string, personId: string) => request<HouseholdResponse>(`/api/households/${householdId}/members`, {
            method: 'POST', body: JSON.stringify({personId}),
        }),
        addMembers: (householdId: string, personIds: string[]) => request<HouseholdResponse>(`/api/households/${householdId}/members/batch`, {
            method: 'POST', body: JSON.stringify({personIds}),
        }),
        removeMember: (householdId: string, personId: string) => request<HouseholdResponse>(`/api/households/${householdId}/members/${personId}`, {
            method: 'DELETE',
        }),
        delete: (householdId: string) => request<void>(`/api/households/${householdId}`, {method: 'DELETE'}),
    },
}

export interface AuthAccount {
    id: string
    email: string
    role: 'ADMIN' | 'MEMBER'
    profileComplete: boolean
    profileDetailsComplete: boolean
    googleConnected: boolean
    personId?: string | null
    passwordSetupRequired: boolean
    approvalPending: boolean
    suggestedFirstName?: string | null
    suggestedLastName?: string | null
    suggestedBirthDate?: string | null
    suggestedGender?: string | null
}

export interface PendingAccount {
    id: string;
    email: string;
    registeredAt: string;
    invitationType?: string;
    invitedProfileName?: string
}

export interface InvitationSummary {
    id: string;
    email: string;
    type: string;
    profileName?: string;
    expiresAt: string
}
