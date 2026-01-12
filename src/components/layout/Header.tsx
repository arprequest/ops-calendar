import { format } from 'date-fns'
import { clsx } from 'clsx'
import { useAuthStore } from '../../stores/authStore'
import { useCalendarStore } from '../../stores/calendarStore'
import type { CalendarView } from '../../types'

const views: { key: CalendarView; label: string }[] = [
  { key: 'daily', label: 'Daily' },
  { key: 'weekly', label: 'Weekly' },
  { key: 'monthly', label: 'Monthly' },
  { key: 'yearly', label: 'Yearly' },
]

export default function Header() {
  const { user, logout } = useAuthStore()
  const { currentDate, view, setView, goToToday, navigatePrev, navigateNext } = useCalendarStore()

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

  return (
    <header className="bg-white border-b border-gray-200 px-6 py-4">
      <div className="flex items-center justify-between">
        {/* Date navigation */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <button
              onClick={navigatePrev}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="Previous"
            >
              <ChevronLeftIcon className="w-5 h-5 text-gray-600" />
            </button>
            <button
              onClick={goToToday}
              className="px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
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
          <h1 className="text-xl font-semibold text-gray-900">{getDateDisplay()}</h1>
        </div>

        {/* View selector + User menu */}
        <div className="flex items-center gap-4">
          {/* View tabs */}
          <div className="flex bg-gray-100 rounded-lg p-1">
            {views.map(({ key, label }) => (
              <button
                key={key}
                onClick={() => setView(key)}
                className={clsx(
                  'px-3 py-1.5 text-sm font-medium rounded-md transition-colors',
                  view === key
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                )}
              >
                {label}
              </button>
            ))}
          </div>

          {/* User menu */}
          <div className="relative group">
            <button className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 transition-colors">
              <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                <span className="text-sm font-medium text-blue-700">
                  {user?.username.charAt(0).toUpperCase()}
                </span>
              </div>
              <span className="text-sm font-medium text-gray-700">{user?.username}</span>
              <ChevronDownIcon className="w-4 h-4 text-gray-500" />
            </button>

            {/* Dropdown */}
            <div className="absolute right-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 hidden group-hover:block z-10">
              <div className="px-4 py-2 border-b border-gray-100">
                <p className="text-sm font-medium text-gray-900">{user?.username}</p>
                <p className="text-xs text-gray-500 capitalize">{user?.role}</p>
              </div>
              <button
                onClick={logout}
                className="w-full text-left px-4 py-2 text-sm text-gray-700 hover:bg-gray-100"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
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
