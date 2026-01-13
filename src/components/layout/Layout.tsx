import { Outlet } from 'react-router-dom'
import Sidebar from './Sidebar'
import Header from './Header'
import TaskDetailPanel from '../tasks/TaskDetailPanel'
import { useUIStore } from '../../stores/uiStore'

export default function Layout() {
  const { isMobileMenuOpen, closeMobileMenu } = useUIStore()

  return (
    <div className="min-h-screen flex">
      {/* Mobile sidebar overlay */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black bg-opacity-50 z-40 md:hidden"
          onClick={closeMobileMenu}
        />
      )}

      {/* Sidebar - hidden on mobile unless menu is open */}
      <div
        className={`
          fixed inset-y-0 left-0 z-50 transform transition-transform duration-300 ease-in-out
          md:relative md:translate-x-0
          ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}
        `}
      >
        <Sidebar />
      </div>

      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 p-3 md:p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
      <TaskDetailPanel />
    </div>
  )
}
