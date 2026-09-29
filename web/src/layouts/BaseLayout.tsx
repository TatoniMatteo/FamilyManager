import {Outlet} from 'react-router-dom'
import {Sidebar} from './Sidebar'
import {Topbar} from './Topbar'

export function BaseLayout() {
    return (
        <div className="family-app-root">
            {/* Sidebar Fissa di Navigazione */}
            <Sidebar/>

            {/* Area Principale con Topbar e Contenuto Dinamico */}
            <div className="app-main-viewport">
                <Topbar/>

                <main className="app-content-body">
                    <Outlet/>
                </main>
            </div>
        </div>
    )
}
