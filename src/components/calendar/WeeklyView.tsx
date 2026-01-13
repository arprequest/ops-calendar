import { useQuery } from '@tanstack/react-query'
import { format, startOfWeek, addDays, isToday } from 'date-fns'
import { clsx } from 'clsx'
import { useCalendarStore, getDateRange } from '../../stores/calendarStore'
import type { TaskInstance, Category } from '../../types'

export default function WeeklyView() {
  const { currentDate, selectedCategories, setCurrentDate, setView } = useCalendarStore()
  const { start, end } = getDateRange(currentDate, 'weekly')
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 0 })

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories')
      if (!response.ok) throw new Error('Failed to fetch categories')
      const data = await response.json()
      return data.data || []
    },
  })

  const { data: instances = [], isLoading } = useQuery<TaskInstance[]>({
    queryKey: ['instances', format(start, 'yyyy-MM-dd'), format(end, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(
        `/api/instances?start=${format(start, 'yyyy-MM-dd')}&end=${format(end, 'yyyy-MM-dd')}`
      )
      if (!response.ok) throw new Error('Failed to fetch instances')
      const data = await response.json()
      return data.data || []
    },
  })

  // Generate days of the week
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i))

  // Filter and group instances by date
  const getTasksForDay = (date: Date) => {
    const dateStr = format(date, 'yyyy-MM-dd')
    let dayTasks = instances.filter((i) => i.scheduled_date === dateStr)

    if (selectedCategories.length > 0) {
      dayTasks = dayTasks.filter((t) =>
        selectedCategories.includes(t.task_definition?.category_id || 0)
      )
    }

    return dayTasks
  }

  const getCategoryColor = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.color || '#6B7280'
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <>
      {/* Desktop view - 7 column grid */}
      <div className="hidden md:block card overflow-hidden">
        {/* Header row */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {days.map((day) => (
            <div
              key={day.toISOString()}
              className={clsx(
                'p-3 text-center border-r last:border-r-0 border-gray-200',
                isToday(day) && 'bg-blue-50'
              )}
            >
              <div className="text-xs text-gray-500 uppercase">{format(day, 'EEE')}</div>
              <div
                className={clsx(
                  'text-lg font-semibold mt-1',
                  isToday(day) ? 'text-blue-600' : 'text-gray-900'
                )}
              >
                {format(day, 'd')}
              </div>
            </div>
          ))}
        </div>

        {/* Tasks grid */}
        <div className="grid grid-cols-7 min-h-[400px]">
          {days.map((day) => {
            const dayTasks = getTasksForDay(day)
            const completed = dayTasks.filter((t) => t.status === 'completed').length

            return (
              <div
                key={day.toISOString()}
                className={clsx(
                  'border-r last:border-r-0 border-gray-200 p-2 cursor-pointer hover:bg-gray-50 transition-colors',
                  isToday(day) && 'bg-blue-50/50'
                )}
                onClick={() => {
                  setCurrentDate(day)
                  setView('daily')
                }}
              >
                {/* Task list */}
                <div className="space-y-1">
                  {dayTasks.slice(0, 8).map((instance) => (
                    <div
                      key={instance.id}
                      className={clsx(
                        'px-2 py-1 rounded text-xs truncate',
                        instance.status === 'completed'
                          ? 'bg-gray-100 text-gray-400 line-through'
                          : 'text-white'
                      )}
                      style={{
                        backgroundColor:
                          instance.status === 'completed'
                            ? undefined
                            : getCategoryColor(instance.task_definition?.category_id || 0),
                      }}
                      title={instance.task_definition?.title}
                    >
                      {instance.task_definition?.title}
                    </div>
                  ))}
                  {dayTasks.length > 8 && (
                    <div className="text-xs text-gray-500 text-center">
                      +{dayTasks.length - 8} more
                    </div>
                  )}
                </div>

                {/* Summary footer */}
                {dayTasks.length > 0 && (
                  <div className="mt-2 pt-2 border-t border-gray-100 text-xs text-gray-500 text-center">
                    {completed}/{dayTasks.length} done
                  </div>
                )}
              </div>
            )
          })}
        </div>
      </div>

      {/* Mobile view - vertical list */}
      <div className="md:hidden space-y-3">
        {days.map((day) => {
          const dayTasks = getTasksForDay(day)
          const completed = dayTasks.filter((t) => t.status === 'completed').length

          return (
            <div
              key={day.toISOString()}
              className={clsx(
                'card overflow-hidden',
                isToday(day) && 'ring-2 ring-blue-500'
              )}
            >
              {/* Day header */}
              <button
                onClick={() => {
                  setCurrentDate(day)
                  setView('daily')
                }}
                className={clsx(
                  'w-full flex items-center justify-between p-3 border-b border-gray-200',
                  isToday(day) ? 'bg-blue-50' : 'bg-gray-50'
                )}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={clsx(
                      'w-10 h-10 rounded-full flex items-center justify-center font-semibold',
                      isToday(day)
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-700'
                    )}
                  >
                    {format(day, 'd')}
                  </div>
                  <div className="text-left">
                    <div className={clsx(
                      'font-medium',
                      isToday(day) ? 'text-blue-600' : 'text-gray-900'
                    )}>
                      {format(day, 'EEEE')}
                    </div>
                    <div className="text-sm text-gray-500">
                      {format(day, 'MMMM d')}
                    </div>
                  </div>
                </div>
                {dayTasks.length > 0 && (
                  <div className="text-sm text-gray-500">
                    {completed}/{dayTasks.length}
                  </div>
                )}
              </button>

              {/* Tasks */}
              {dayTasks.length > 0 ? (
                <div className="divide-y divide-gray-100">
                  {dayTasks.slice(0, 5).map((instance) => (
                    <div
                      key={instance.id}
                      className="flex items-center gap-3 p-3"
                    >
                      <div
                        className="w-3 h-3 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: getCategoryColor(
                            instance.task_definition?.category_id || 0
                          ),
                        }}
                      />
                      <span
                        className={clsx(
                          'flex-1 truncate',
                          instance.status === 'completed'
                            ? 'text-gray-400 line-through'
                            : 'text-gray-900'
                        )}
                      >
                        {instance.task_definition?.title}
                      </span>
                      {instance.status === 'completed' && (
                        <CheckIcon className="w-4 h-4 text-green-500 flex-shrink-0" />
                      )}
                    </div>
                  ))}
                  {dayTasks.length > 5 && (
                    <div className="p-3 text-center text-sm text-gray-500">
                      +{dayTasks.length - 5} more tasks
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-4 text-center text-sm text-gray-400">
                  No tasks
                </div>
              )}
            </div>
          )
        })}
      </div>
    </>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
    </svg>
  )
}
