import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format, isBefore, startOfDay } from 'date-fns'
import { clsx } from 'clsx'
import { useCalendarStore } from '../../stores/calendarStore'
import { useTaskPanelStore } from '../../stores/taskPanelStore'
import type { TaskInstance, Category } from '../../types'
import { useState } from 'react'

export default function DailyView() {
  const { currentDate, selectedCategories } = useCalendarStore()
  const queryClient = useQueryClient()
  const today = startOfDay(new Date())
  const dateStr = format(currentDate, 'yyyy-MM-dd')

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
    queryKey: ['instances', dateStr],
    queryFn: async () => {
      const response = await fetch(`/api/instances?start=${dateStr}&end=${dateStr}`)
      if (!response.ok) throw new Error('Failed to fetch instances')
      const data = await response.json()
      return data.data || []
    },
  })

  // Also fetch overdue tasks
  const { data: overdueInstances = [] } = useQuery<TaskInstance[]>({
    queryKey: ['instances', 'overdue', dateStr],
    queryFn: async () => {
      const pastDate = format(new Date(currentDate.getTime() - 30 * 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      const yesterday = format(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000), 'yyyy-MM-dd')
      const response = await fetch(`/api/instances?start=${pastDate}&end=${yesterday}&status=pending`)
      if (!response.ok) return []
      const data = await response.json()
      return data.data || []
    },
    enabled: isBefore(currentDate, today) === false,
  })

  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const response = await fetch(`/api/instances/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      })
      if (!response.ok) throw new Error('Failed to update status')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] })
    },
  })

  // Filter by selected categories
  const filterByCategory = (tasks: TaskInstance[]) => {
    if (selectedCategories.length === 0) return tasks
    return tasks.filter((t) => selectedCategories.includes(t.task_definition?.category_id || 0))
  }

  const filteredInstances = filterByCategory(instances)
  const filteredOverdue = filterByCategory(overdueInstances)

  // Group by category
  const groupedByCategory = categories.map((category) => ({
    category,
    tasks: filteredInstances.filter((t) => t.task_definition?.category_id === category.id),
  })).filter((g) => g.tasks.length > 0)

  const completed = filteredInstances.filter((t) => t.status === 'completed').length
  const total = filteredInstances.length
  const progress = total > 0 ? (completed / total) * 100 : 0

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Overdue section */}
      {filteredOverdue.length > 0 && (
        <OverdueSection
          instances={filteredOverdue}
          categories={categories}
          onStatusChange={(id, status, notes) =>
            updateStatusMutation.mutate({ id, status, notes })
          }
        />
      )}

      {/* Today's tasks by category */}
      {groupedByCategory.length === 0 ? (
        <div className="card p-8 text-center text-gray-500">
          No tasks scheduled for this day.
        </div>
      ) : (
        <div className="space-y-4">
          {groupedByCategory.map(({ category, tasks }) => (
            <CategorySection
              key={category.id}
              category={category}
              tasks={tasks}
              onStatusChange={(id, status, notes) =>
                updateStatusMutation.mutate({ id, status, notes })
              }
            />
          ))}
        </div>
      )}

      {/* Progress bar */}
      {total > 0 && (
        <div className="card p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium text-gray-700">Progress</span>
            <span className="text-sm text-gray-500">
              {completed}/{total} completed ({Math.round(progress)}%)
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 transition-all duration-300"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}
    </div>
  )
}

function OverdueSection({
  instances,
  categories,
  onStatusChange,
}: {
  instances: TaskInstance[]
  categories: Category[]
  onStatusChange: (id: number, status: string, notes?: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [selectedIds, setSelectedIds] = useState<Set<number>>(new Set())

  // Group overdue by category
  const groupedByCategory = categories.map((category) => ({
    category,
    tasks: instances.filter((t) => t.task_definition?.category_id === category.id),
  })).filter((g) => g.tasks.length > 0)

  const handleSelectAll = (_categoryId: number, tasks: TaskInstance[]) => {
    const taskIds = tasks.map((t) => t.id)
    const allSelected = taskIds.every((id) => selectedIds.has(id))

    if (allSelected) {
      // Deselect all
      const newSelected = new Set(selectedIds)
      taskIds.forEach((id) => newSelected.delete(id))
      setSelectedIds(newSelected)
    } else {
      // Select all
      const newSelected = new Set(selectedIds)
      taskIds.forEach((id) => newSelected.add(id))
      setSelectedIds(newSelected)
    }
  }

  const handleBulkStatusChange = (status: string) => {
    selectedIds.forEach((id) => {
      onStatusChange(id, status)
    })
    setSelectedIds(new Set())
  }

  const toggleSelection = (id: number) => {
    const newSelected = new Set(selectedIds)
    if (newSelected.has(id)) {
      newSelected.delete(id)
    } else {
      newSelected.add(id)
    }
    setSelectedIds(newSelected)
  }

  return (
    <div className="card border-red-200 bg-red-50">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-red-100"
      >
        <div className="flex items-center gap-2">
          <WarningIcon className="w-4 h-4 text-red-700" />
          <span className="text-sm font-semibold text-red-700">OVERDUE ({instances.length})</span>
        </div>
        <ChevronIcon className={clsx('w-5 h-5 text-red-400 transition-transform', isExpanded && 'rotate-180')} />
      </button>

      {isExpanded && (
        <div className="border-t border-red-200">
          {/* Bulk actions */}
          {selectedIds.size > 0 && (
            <div className="px-4 py-2 bg-red-100 border-b border-red-200 flex items-center gap-3">
              <span className="text-sm text-red-700">{selectedIds.size} selected</span>
              <button
                onClick={() => handleBulkStatusChange('completed')}
                className="px-2 py-1 text-xs bg-green-600 text-white rounded hover:bg-green-700"
              >
                Mark Completed
              </button>
              <button
                onClick={() => handleBulkStatusChange('skipped')}
                className="px-2 py-1 text-xs bg-gray-600 text-white rounded hover:bg-gray-700"
              >
                Mark Skipped
              </button>
              <button
                onClick={() => setSelectedIds(new Set())}
                className="px-2 py-1 text-xs text-red-700 hover:text-red-900"
              >
                Clear
              </button>
            </div>
          )}

          {/* Group by category */}
          {groupedByCategory.map(({ category, tasks }) => {
            const allSelected = tasks.every((t) => selectedIds.has(t.id))
            const someSelected = tasks.some((t) => selectedIds.has(t.id))

            return (
              <div key={category.id} className="border-b border-red-200 last:border-b-0">
                <div className="px-4 py-2 bg-red-100/50 flex items-center gap-2">
                  <button
                    onClick={() => handleSelectAll(category.id, tasks)}
                    className={clsx(
                      'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
                      allSelected
                        ? 'bg-red-600 border-red-600 text-white'
                        : someSelected
                        ? 'bg-red-200 border-red-400'
                        : 'border-red-300 hover:border-red-500'
                    )}
                  >
                    {allSelected && <CheckIcon className="w-3 h-3" />}
                    {someSelected && !allSelected && <span className="w-2 h-2 bg-red-600 rounded-sm" />}
                  </button>
                  <span
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: category.color }}
                  />
                  <span className="text-xs font-medium text-red-700">{category.name}</span>
                  <span className="text-xs text-red-500">({tasks.length})</span>
                </div>
                <div className="divide-y divide-red-100">
                  {tasks.map((instance) => (
                    <TaskItem
                      key={instance.id}
                      instance={instance}
                      categories={categories}
                      onStatusChange={(status, notes) => onStatusChange(instance.id, status, notes)}
                      isOverdue
                      isSelected={selectedIds.has(instance.id)}
                      onToggleSelect={() => toggleSelection(instance.id)}
                    />
                  ))}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

function CategorySection({
  category,
  tasks,
  onStatusChange,
}: {
  category: Category
  tasks: TaskInstance[]
  onStatusChange: (id: number, status: string, notes?: string) => void
}) {
  const [isExpanded, setIsExpanded] = useState(true)

  return (
    <div className="card">
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="w-full flex items-center justify-between p-4 hover:bg-gray-50"
      >
        <div className="flex items-center gap-3">
          <span
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: category.color }}
          />
          <span className="font-semibold text-gray-900">{category.name.toUpperCase()}</span>
          <span className="text-sm text-gray-500">({tasks.length})</span>
        </div>
        <ChevronIcon className={clsx('w-5 h-5 text-gray-400 transition-transform', isExpanded && 'rotate-180')} />
      </button>

      {isExpanded && (
        <div className="border-t border-gray-200 divide-y divide-gray-100">
          {tasks.map((instance) => (
            <TaskItem
              key={instance.id}
              instance={instance}
              categories={[category]}
              onStatusChange={(status, notes) => onStatusChange(instance.id, status, notes)}
            />
          ))}
        </div>
      )}
    </div>
  )
}

function TaskItem({
  instance,
  categories,
  onStatusChange,
  isOverdue = false,
  isSelected = false,
  onToggleSelect,
}: {
  instance: TaskInstance
  categories: Category[]
  onStatusChange: (status: string, notes?: string) => void
  isOverdue?: boolean
  isSelected?: boolean
  onToggleSelect?: () => void
}) {
  const [showNotes, setShowNotes] = useState(false)
  const [notes, setNotes] = useState(instance.notes || '')
  const { openInstance } = useTaskPanelStore()

  const category = categories.find((c) => c.id === instance.task_definition?.category_id)

  return (
    <div className={clsx('px-4 py-3', isOverdue && 'bg-red-50', isSelected && 'bg-red-100')}>
      <div className="flex items-center gap-3">
        {/* Selection checkbox (for bulk actions in overdue) */}
        {onToggleSelect && (
          <button
            onClick={onToggleSelect}
            className={clsx(
              'w-4 h-4 rounded border-2 flex items-center justify-center transition-colors',
              isSelected
                ? 'bg-red-600 border-red-600 text-white'
                : 'border-red-300 hover:border-red-500'
            )}
          >
            {isSelected && <CheckIcon className="w-2 h-2" />}
          </button>
        )}

        {/* Completion checkbox */}
        <button
          onClick={() => {
            const newStatus = instance.status === 'completed' ? 'pending' : 'completed'
            onStatusChange(newStatus)
          }}
          className={clsx(
            'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
            instance.status === 'completed'
              ? 'bg-blue-600 border-blue-600 text-white'
              : 'border-gray-300 hover:border-blue-500'
          )}
        >
          {instance.status === 'completed' && (
            <CheckIcon className="w-3 h-3" />
          )}
        </button>

        {/* Task title - clickable to open panel */}
        <div className="flex-1">
          <button
            onClick={() => openInstance(instance)}
            className={clsx(
              'font-medium text-left hover:underline',
              instance.status === 'completed' ? 'text-gray-400 line-through' : 'text-gray-900'
            )}
          >
            {instance.task_definition?.title}
          </button>
          {isOverdue && (
            <span className="ml-2 text-sm text-red-600">
              ({format(new Date(instance.scheduled_date), 'MMM d')})
            </span>
          )}
          {instance.status === 'completed' && instance.completed_at && (
            <span className="ml-2 text-sm text-gray-400">
              completed {format(new Date(instance.completed_at), 'h:mm a')}
            </span>
          )}
        </div>

        {/* Category badge (for overdue) */}
        {isOverdue && category && (
          <span className="text-xs text-gray-500">{category.name}</span>
        )}

        {/* Actions */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowNotes(!showNotes)}
            className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
          >
            {instance.notes ? 'Edit Note' : 'Add Note'}
          </button>
          {instance.status !== 'skipped' && (
            <button
              onClick={() => onStatusChange('skipped')}
              className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded"
            >
              Skip
            </button>
          )}
        </div>
      </div>

      {/* Notes input */}
      {showNotes && (
        <div className="mt-2 ml-8 flex gap-2">
          <input
            type="text"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Add a note..."
            className="input text-sm flex-1"
          />
          <button
            onClick={() => {
              onStatusChange(instance.status, notes)
              setShowNotes(false)
            }}
            className="btn btn-primary text-sm"
          >
            Save
          </button>
        </div>
      )}

      {/* Show existing notes */}
      {instance.notes && !showNotes && (
        <p className="mt-1 ml-8 text-sm text-gray-500">{instance.notes}</p>
      )}
    </div>
  )
}

function WarningIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="currentColor" viewBox="0 0 20 20">
      <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
    </svg>
  )
}

function CheckIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={3}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  )
}

function ChevronIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
    </svg>
  )
}
