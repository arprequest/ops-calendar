import { useQuery } from '@tanstack/react-query'
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  addDays,
  isSameMonth,
  isToday,
} from 'date-fns'
import { clsx } from 'clsx'
import { useCalendarStore } from '../../stores/calendarStore'
import type { TaskInstance, Category } from '../../types'

export default function MonthlyView() {
  const { currentDate, selectedCategories, setCurrentDate, setView } = useCalendarStore()
  const monthStart = startOfMonth(currentDate)
  const monthEnd = endOfMonth(currentDate)
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 0 })
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 0 })

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
    queryKey: ['instances', format(calendarStart, 'yyyy-MM-dd'), format(calendarEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(
        `/api/instances?start=${format(calendarStart, 'yyyy-MM-dd')}&end=${format(calendarEnd, 'yyyy-MM-dd')}`
      )
      if (!response.ok) throw new Error('Failed to fetch instances')
      const data = await response.json()
      return data.data || []
    },
  })

  // Generate calendar days
  const generateCalendarDays = () => {
    const days: Date[] = []
    let day = calendarStart
    while (day <= calendarEnd) {
      days.push(day)
      day = addDays(day, 1)
    }
    return days
  }

  const calendarDays = generateCalendarDays()
  const weeks = []
  for (let i = 0; i < calendarDays.length; i += 7) {
    weeks.push(calendarDays.slice(i, i + 7))
  }

  // Get tasks for a specific day
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

  // Get special tasks (non-daily) for the day
  const getSpecialTasks = (date: Date) => {
    const dayTasks = getTasksForDay(date)
    return dayTasks.filter((t) => {
      const config = t.task_definition?.recurrence_config
      return config?.type !== 'daily'
    })
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
      {/* Desktop view - grid calendar */}
      <div className="hidden md:block card overflow-hidden">
        {/* Header */}
        <div className="grid grid-cols-7 border-b border-gray-200 bg-gray-50">
          {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => (
            <div key={day} className="p-3 text-center text-xs font-semibold text-gray-500 uppercase">
              {day}
            </div>
          ))}
        </div>

        {/* Calendar grid */}
        <div className="divide-y divide-gray-200">
          {weeks.map((week, weekIndex) => (
            <div key={weekIndex} className="grid grid-cols-7 divide-x divide-gray-200">
              {week.map((day) => {
                const dayTasks = getTasksForDay(day)
                const specialTasks = getSpecialTasks(day)
                const isCurrentMonth = isSameMonth(day, currentDate)

                return (
                  <div
                    key={day.toISOString()}
                    className={clsx(
                      'min-h-[100px] p-2 cursor-pointer hover:bg-gray-50 transition-colors',
                      !isCurrentMonth && 'bg-gray-50/50',
                      isToday(day) && 'bg-blue-50'
                    )}
                    onClick={() => {
                      setCurrentDate(day)
                      setView('daily')
                    }}
                  >
                    {/* Day number */}
                    <div
                      className={clsx(
                        'text-sm font-medium mb-1',
                        isToday(day)
                          ? 'w-7 h-7 bg-blue-600 text-white rounded-full flex items-center justify-center'
                          : isCurrentMonth
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      )}
                    >
                      {format(day, 'd')}
                    </div>

                    {/* Task dots */}
                    {dayTasks.length > 0 && (
                      <div className="flex flex-wrap gap-0.5 mb-1">
                        {dayTasks.slice(0, 8).map((task) => (
                          <div
                            key={task.id}
                            className={clsx(
                              'w-1.5 h-1.5 rounded-full',
                              task.status === 'completed' ? 'bg-gray-300' : ''
                            )}
                            style={{
                              backgroundColor:
                                task.status === 'completed'
                                  ? undefined
                                  : getCategoryColor(task.task_definition?.category_id || 0),
                            }}
                          />
                        ))}
                        {dayTasks.length > 8 && (
                          <span className="text-xs text-gray-400">+{dayTasks.length - 8}</span>
                        )}
                      </div>
                    )}

                    {/* Special tasks (non-daily) */}
                    <div className="space-y-0.5">
                      {specialTasks.slice(0, 3).map((task) => (
                        <div
                          key={task.id}
                          className={clsx(
                            'text-xs truncate px-1 rounded',
                            task.status === 'completed'
                              ? 'text-gray-400 line-through'
                              : 'font-medium'
                          )}
                          style={{
                            color:
                              task.status === 'completed'
                                ? undefined
                                : getCategoryColor(task.task_definition?.category_id || 0),
                          }}
                          title={task.task_definition?.title}
                        >
                          {task.task_definition?.title}
                        </div>
                      ))}
                    </div>
                  </div>
                )
              })}
            </div>
          ))}
        </div>
      </div>

      {/* Mobile view - compact week rows */}
      <div className="md:hidden space-y-2">
        {/* Days of week header */}
        <div className="grid grid-cols-7 text-center">
          {['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((day, i) => (
            <div key={i} className="text-xs font-medium text-gray-500 py-2">
              {day}
            </div>
          ))}
        </div>

        {/* Weeks */}
        {weeks.map((week, weekIndex) => (
          <div key={weekIndex} className="card overflow-hidden">
            <div className="grid grid-cols-7">
              {week.map((day) => {
                const dayTasks = getTasksForDay(day)
                const completed = dayTasks.filter((t) => t.status === 'completed').length
                const pending = dayTasks.length - completed
                const isCurrentMonth = isSameMonth(day, currentDate)

                return (
                  <button
                    key={day.toISOString()}
                    onClick={() => {
                      setCurrentDate(day)
                      setView('daily')
                    }}
                    className={clsx(
                      'p-2 flex flex-col items-center min-h-[60px] border-r last:border-r-0 border-gray-100',
                      !isCurrentMonth && 'bg-gray-50',
                      isToday(day) && 'bg-blue-50'
                    )}
                  >
                    {/* Day number */}
                    <div
                      className={clsx(
                        'w-8 h-8 flex items-center justify-center rounded-full text-sm font-medium mb-1',
                        isToday(day)
                          ? 'bg-blue-600 text-white'
                          : isCurrentMonth
                          ? 'text-gray-900'
                          : 'text-gray-400'
                      )}
                    >
                      {format(day, 'd')}
                    </div>

                    {/* Task indicator */}
                    {dayTasks.length > 0 && (
                      <div className="flex items-center gap-0.5">
                        {pending > 0 && (
                          <div className="flex gap-0.5">
                            {Array.from({ length: Math.min(pending, 3) }).map((_, i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-blue-500"
                              />
                            ))}
                          </div>
                        )}
                        {completed > 0 && (
                          <div className="flex gap-0.5">
                            {Array.from({ length: Math.min(completed, 2) }).map((_, i) => (
                              <div
                                key={i}
                                className="w-1.5 h-1.5 rounded-full bg-gray-300"
                              />
                            ))}
                          </div>
                        )}
                      </div>
                    )}
                  </button>
                )
              })}
            </div>

            {/* Week summary - tasks with activity */}
            {(() => {
              const weekTasks = week.flatMap((day) =>
                isSameMonth(day, currentDate) ? getTasksForDay(day) : []
              )
              const uniqueTasks = new Map<number, TaskInstance>()
              weekTasks.forEach((t) => {
                if (!uniqueTasks.has(t.task_definition?.id || 0)) {
                  uniqueTasks.set(t.task_definition?.id || 0, t)
                }
              })
              const pendingTasks = Array.from(uniqueTasks.values())
                .filter((t) => t.status === 'pending')
                .slice(0, 3)

              if (pendingTasks.length === 0) return null

              return (
                <div className="border-t border-gray-100 p-2 space-y-1">
                  {pendingTasks.map((task) => (
                    <div
                      key={task.id}
                      className="flex items-center gap-2 text-xs text-gray-600"
                    >
                      <div
                        className="w-2 h-2 rounded-full flex-shrink-0"
                        style={{
                          backgroundColor: getCategoryColor(
                            task.task_definition?.category_id || 0
                          ),
                        }}
                      />
                      <span className="truncate">
                        {task.task_definition?.title}
                      </span>
                      <span className="text-gray-400 flex-shrink-0">
                        {format(new Date(task.scheduled_date), 'EEE')}
                      </span>
                    </div>
                  ))}
                </div>
              )
            })()}
          </div>
        ))}
      </div>
    </>
  )
}
