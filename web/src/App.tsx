import {createBrowserRouter, Navigate, Outlet, RouterProvider} from 'react-router-dom'
import {BaseLayout} from './layouts/BaseLayout'
import {FamilyProvider} from './context/FamilyContext'
import {ToastProvider} from './context/ToastContext'
import {HomeDashboard} from './views/HomeDashboard'
import {FamilyPage} from './views/FamilyPage'
import {PlaceholderView} from './views/PlaceholderView'
import {NotFoundView} from './views/NotFoundView'
import {RouteErrorView} from './views/RouteErrorView'
import {HouseholdsPage} from './views/HouseholdsPage'
import {ThemeProvider} from './context/ThemeContext'
import {I18nProvider} from './context/I18nContext'
import {SettingsPage} from './views/SettingsPage'
import {AuthProvider} from './context/AuthContext'
import {SystemAvailabilityGate} from './components/SystemAvailabilityGate'
import {RootErrorBoundary} from './components/RootErrorBoundary'
import {SystemStatusPage} from './views/SystemStatusPage'
import {DocumentationPage} from './views/DocumentationPage'
import {
    AuthGate,
    ChangePasswordPage,
    InitialSetupPage,
    LoginPage,
    PendingApprovalPage,
    RegistrationPage,
    RequestPasswordResetPage,
    VerifyEmailPage
} from './views/AuthPages'

const futureSections = [
    'calendar', 'meals', 'groceries', 'health', 'activities',
    'birthdays', 'events', 'holidays', 'work', 'notes',
]

function AuthenticatedLayout() {
    return <FamilyProvider><BaseLayout/></FamilyProvider>
}

function ApplicationRoutes() {
    return <SystemAvailabilityGate><ToastProvider><AuthProvider><Outlet/></AuthProvider></ToastProvider></SystemAvailabilityGate>
}

const router = createBrowserRouter([
    {
        path: 'documentation/:page?',
        element: <DocumentationPage/>,
        errorElement: <RouteErrorView/>,
    },
    {
        element: <ApplicationRoutes/>,
        children: [
            {
                path: 'maintenance',
                element: <SystemStatusPage kind="maintenance" onRetry={() => window.location.reload()}/>
            },
            {path: 'outage', element: <SystemStatusPage kind="unavailable" onRetry={() => window.location.reload()}/>},
            {path: 'login', element: <LoginPage/>},
            {path: 'register', element: <RegistrationPage/>},
            {path: 'verify-email', element: <VerifyEmailPage/>},
            {path: 'password-reset-request', element: <RequestPasswordResetPage/>},
            {path: 'reset-password', element: <ChangePasswordPage/>},
            {path: 'set-password', element: <ChangePasswordPage setup/>},
            {path: 'initial-setup', element: <InitialSetupPage/>},
            {path: 'pending-approval', element: <PendingApprovalPage/>},
            {
                element: <AuthGate/>,
                errorElement: <RouteErrorView/>,
                children: [
                    {
                        element: <AuthenticatedLayout/>,
                        children: [
                            {index: true, element: <HomeDashboard/>},
                            {path: 'family', element: <FamilyPage/>},
                            {path: 'family/households', element: <HouseholdsPage/>},
                            {path: 'family/:personId', element: <FamilyPage/>},
                            {path: 'households', element: <Navigate to="/family/households" replace/>},
                            {path: 'settings', element: <SettingsPage/>},
                            {path: 'family-tree', element: <Navigate to="/family" replace/>},
                            ...futureSections.map((path) => ({path, element: <PlaceholderView/>})),
                        ],
                    },
                ],
            },
            {path: '*', element: <NotFoundView/>},
        ],
    },
    {path: '*', element: <NotFoundView/>},
])

export default function App() {
    return (
        <RootErrorBoundary>
            <I18nProvider>
                <ThemeProvider>
                    <RouterProvider router={router}/>
                </ThemeProvider>
            </I18nProvider>
        </RootErrorBoundary>
    )
}
