import { useState } from 'react'
import { format } from 'date-fns'
import { clsx } from 'clsx'
import { useAuthStore } from '../../stores/authStore'
import { useCalendarStore } from '../../stores/calendarStore'
import { useUIStore } from '../../stores/uiStore'
import type { CalendarView } from '../../types'

const views: { key: CalendarView; label: string; shortLabel: string }[] = [
  { key: 'daily', label: 'Daily', shortLabel: 'Day' },
  { key: 'weekly', label: 'Weekly', shortLabel: 'Week' },
  { key: 'monthly', label: 'Monthly', shortLabel: 'Month' },
  { key: 'yearly', label: 'Yearly', shortLabel: 'Year' },
]

export default function Header() {
  const { user, logout } = useAuthStore()
  const { currentDate, view, setView, goToToday, navigatePrev, navigateNext } = useCalendarStore()
  const { toggleMobileMenu } = useUIStore()
  const [showUserMenu, setShowUserMenu] = useState(false)

  const getDateDisplay = () => {
    switch (view) {
      case 'daily':
        return format(currentDate, 'EEEE, MMMM d, yyyy')
      case 'weekly':
        return `Week of ${format(currentDate, 'MMMM d, yyyy')}`
      case 'monthly':
        return format(currentDate, 'MMMM yyyy')
      case 'yearly':
        return format(currentDate, 'yyyy')
    }
  }

  const getShortDateDisplay = () => {
    switch (view) {
      case 'daily':
        return format(currentDate, 'MMM d, yyyy')
      case 'weekly':
        return format(currentDate, 'MMM d')
      case 'monthly':
        return format(currentDate, 'MMM yyyy')
      case 'yearly':
        return format(currentDate, 'yyyy')
    }
  }

  return (
    <header className="bg-white border-b border-gray-200 px-3 md:px-6 py-3 md:py-4">
      <div className="flex items-center justify-between gap-2">
        {/* Mobile menu button + Date navigation */}
        <div className="flex items-center gap-2 md:gap-4 min-w-0">
          {/* Hamburger menu - mobile only */}
          <button
            onClick={toggleMobileMenu}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors md:hidden"
            aria-label="Open menu"
          >
            <MenuIcon className="w-5 h-5 text-gray-600" />
          </button>

          <div className="flex items-center gap-1 md:gap-2">
            <button
              onClick={navigatePrev}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Previous"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={goToToday}
              className="px-2 md:px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
            >
              Today
            </button>
            <button
              onClick={navigateNext}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Next"
            >
              <ChevronRightIcon className="w-5 h-5 text-gray-600" />
            </button>
          </div>

          {/* Date display - responsive */}
          <h1 className="text-base md:text-xl font-semibold text-gray-900 truncate">
            <span className="hidden md:inline">{getDateDisplay()}</span>
            <span className="md:hidden">{getShortDateDisplay()}</span>
          </h1>
        </div>

        {/* View selector + User menu */}
        <div className="flex items-center gap-2 md:gap-4 flex-shrink-0">
          {/* View tabs - responsive */}
          <div className="flex bg-gray-100 rounded-lg p-0.5 md:p-1">
            {views.map(({ key, label, shortLabel }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={clsx(
                  'px-2 md:px-3 py-1 md:py-1.5 text-xs md:text-sm font-medium rounded-md transition-colors',
                  view === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                <span className="hidden md:inline">{label}</span>
                <span className="md:hidden">{shortLabel}</span>
              </button>
            ))}
          </div>

          {/* User menu - click-based for touch support */}
          <div className="relative">
            <button
              onClick={() => setShowUserMenu(!showUserMenu)}
              className="flex items-center gap-1 md:gap-2 p-1.5 md:px-3 md:py-2 rounded-lg hover:bg-gray-100 transition-colors"
            >
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-700">
                  {user?.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="hidden md:inline text-sm font-medium text-gray-700">{user?.username}</span>
              <ChevronDownIcon className="hidden md:block w-4 h-4 text-gray-500" />
            </button>

            {/* Dropdown - click controlled */}
            {showUserMenu && (
              <>
                {/* Backdrop to close menu */}
                <div
                  className="fixed inset-0 z-10"
                  onClick={() => setShowUserMenu(false)}
                />
                <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-20">
                  <div className="px-4 py-2 border-b border-gray-100">
                    <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                    <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
                  </div>
                  <button
                    onClick={() => {
                      setShowUserMenu(false)
                      logout()
                    }}
                    className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
                  >
                    Sign out
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </header>
  )
}

function MenuIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
    </svg>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
    </svg>
  )
}

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
