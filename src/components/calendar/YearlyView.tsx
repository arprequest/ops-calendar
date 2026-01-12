import { useQuery } from '@tanstack/react-query'
import {
  format,
  startOfYear,
  endOfYear,
  startOfMonth,
  endOfMonth,
  eachMonthOfInterval,
  isSameMonth,
} from 'date-fns'
import { clsx } from 'clsx'
import { useCalendarStore } from '../../stores/calendarStore'
import type { TaskInstance } from '../../types'

export default function YearlyView() {
  const { currentDate, selectedCategories, setCurrentDate, setView } = useCalendarStore()
  const yearStart = startOfYear(currentDate)
  const yearEnd = endOfYear(currentDate)

  const { data: instances = [], isLoading } = useQuery<TaskInstance[]>({
    queryKey: ['instances', format(yearStart, 'yyyy-MM-dd'), format(yearEnd, 'yyyy-MM-dd')],
    queryFn: async () => {
      const response = await fetch(
        `/api/instances?start=${format(yearStart, 'yyyy-MM-dd')}&end=${format(yearEnd, 'yyyy-MM-dd')}`
      )
      if (!response.ok) throw new Error('Failed to fetch instances')
      const data = await response.json()
      return data.data || []
    },
  })

  const months = eachMonthOfInterval({ start: yearStart, end: yearEnd })

  // Get special tasks (non-daily, non-weekly) for a month
  const getSpecialTasksForMonth = (month: Date) => {
    const monthStartDate = startOfMonth(month)
    const monthEndDate = endOfMonth(month)

    let monthTasks = instances.filter((i) => {
      const date = new Date(i.scheduled_date)
      return date >= monthStartDate && date <= monthEndDate
    })

    if (selectedCategories.length > 0) {
      monthTasks = monthTasks.filter((t) =>
        selectedCategories.includes(t.task_definition?.category_id || 0)
      )
    }

    // Filter to non-daily/weekly tasks
    return monthTasks.filter((t) => {
      const config = t.task_definition?.recurrence_config
      return config?.type !== 'daily' && config?.type !== 'weekly'
    })
  }

  // Get task count for a month
  const getTaskCountForMonth = (month: Date) => {
    const monthStartDate = startOfMonth(month)
    const monthEndDate = endOfMonth(month)

    let monthTasks = instances.filter((i) => {
      const date = new Date(i.scheduled_date)
      return date >= monthStartDate && date <= monthEndDate
    })

    if (selectedCategories.length > 0) {
      monthTasks = monthTasks.filter((t) =>
        selectedCategories.includes(t.task_definition?.category_id || 0)
      )
    }

    return {
      total: monthTasks.length,
      completed: monthTasks.filter((t) => t.status === 'completed').length,
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
      {months.map((month) => {
        const specialTasks = getSpecialTasksForMonth(month)
        const { total, completed } = getTaskCountForMonth(month)
        const progress = total > 0 ? (completed / total) * 100 : 0
        const isCurrentMonth = isSameMonth(month, new Date())

        return (
          <div
            key={month.toISOString()}
            className={clsx(
              'card p-4 cursor-pointer hover:shadow-md transition-shadow',
              isCurrentMonth && 'ring-2 ring-blue-500'
            )}
            onClick={() => {
              setCurrentDate(month)
              setView('monthly')
            }}
          >
            {/* Month header */}
            <div className="flex items-center justify-between mb-3">
              <h3 className="font-semibold text-gray-900">{format(month, 'MMMM')}</h3>
              {total > 0 && (
                <span className="text-xs text-gray-500">
                  {completed}/{total}
                </span>
              )}
            </div>

            {/* Special tasks list */}
            <div className="space-y-1 mb-3 min-h-[60px]">
              {specialTasks.slice(0, 4).map((task) => (
                <div
                  key={task.id}
                  className={clsx(
                    'text-xs truncate flex items-center gap-1',
                    task.status === 'completed' && 'text-gray-400 line-through'
                  )}
                >
                  <span className="text-gray-400">{format(new Date(task.scheduled_date), 'd')}</span>
                  <span className={task.status === 'completed' ? '' : 'font-medium'}>
                    {task.task_definition?.title}
                  </span>
                </div>
              ))}
              {specialTasks.length > 4 && (
                <div className="text-xs text-gray-400">
                  +{specialTasks.length - 4} more
                </div>
              )}
              {specialTasks.length === 0 && (
                <div className="text-xs text-gray-400 italic">
                  No special deadlines
                </div>
              )}
            </div>

            {/* Progress bar */}
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )
      })}
    </div>
  )
}
