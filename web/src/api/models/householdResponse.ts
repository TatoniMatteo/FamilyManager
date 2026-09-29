import type {PersonResponse} from './personResponse'

export interface HouseholdMemberResponse {
    person: PersonResponse
    role: string
}

export interface HouseholdResponse {
    id: string
    name: string
    members: HouseholdMemberResponse[]
}
