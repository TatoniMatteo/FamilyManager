import type {CSSProperties, HTMLAttributes} from 'react'

type GoogleIconProps = Omit<HTMLAttributes<HTMLSpanElement>, 'color'> & {
    size?: number
    color?: string
    strokeWidth?: number
}

function icon(name: string) {
    return function GoogleMaterialIcon({size = 20, color, className, ...props}: GoogleIconProps) {
        const style: CSSProperties = {fontSize: size, ...(color ? {color} : {})}
        return <span
            aria-hidden="true"
            className={`google-material-icon${className ? ` ${className}` : ''}`}
            style={style}
            {...props}
        >{name}</span>
    }
}

export const Bike = icon('pedal_bike')
export const Cake = icon('cake')
export const Calendar = icon('calendar_today')
export const CalendarDays = icon('calendar_month')
export const FileText = icon('description')
export const Heart = icon('favorite')
export const Home = icon('home')
export const Palmtree = icon('beach_access')
export const ShoppingCart = icon('shopping_cart')
export const Utensils = icon('restaurant')
export const Users2 = icon('groups')
export const Briefcase = icon('work')
export const Settings = icon('settings')
export const LogOut = icon('logout')
export const Search = icon('search')
export const X = icon('close')
export const UserPlus = icon('person_add')
export const UserCheck = icon('how_to_reg')
export const Plus = icon('add')
export const GitFork = icon('account_tree')
export const Edit2 = icon('edit')
export const User = icon('person')
export const ChevronRight = icon('chevron_right')
export const ExpandMore = icon('expand_more')
export const UserRound = icon('account_circle')
export const Pencil = icon('edit')
export const ArrowRight = icon('arrow_forward')
export const Check = icon('check')
export const UserMinus = icon('person_remove')
export const Languages = icon('translate')
export const Palette = icon('palette')
export const Sun = icon('light_mode')
export const TriangleAlert = icon('warning_amber')
export const Link2 = icon('link')
export const UserRoundCog = icon('manage_accounts')
export const MailPlus = icon('mark_email_unread')
export const List = icon('view_list')

export function GoogleBrand() {
    return (
        <svg aria-hidden="true" viewBox="0 0 48 48" className="google-brand-icon">
            <path fill="#4285F4"
                  d="M43.611 20.083H42V20H24v8h11.303A12 12 0 1 1 24 12c3.06 0 5.842 1.164 7.938 3.062l5.657-5.657A19.92 19.92 0 0 0 24 4a20 20 0 1 0 19.611 16.083Z"/>
            <path fill="#34A853"
                  d="M6.306 14.691 12.88 19.51A12 12 0 0 1 24 12c3.06 0 5.842 1.164 7.938 3.062l5.657-5.657A19.92 19.92 0 0 0 24 4 19.99 19.99 0 0 0 6.306 14.691Z"/>
            <path fill="#FBBC05"
                  d="M24 44c5.19 0 9.84-1.977 13.367-5.2l-6.17-5.226A11.92 11.92 0 0 1 24 36a12 12 0 0 1-11.1-7.49l-6.56 5.055A19.96 19.96 0 0 0 24 44Z"/>
            <path fill="#EA4335"
                  d="M43.611 20.083H42V20H24v8h11.303a12.04 12.04 0 0 1-4.106 5.574l6.17 5.226C41.105 35.21 44 29.99 44 24c0-1.34-.138-2.65-.389-3.917Z"/>
        </svg>
    )
}
