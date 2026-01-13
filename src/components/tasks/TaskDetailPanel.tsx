import { useState, useEffect } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { format } from 'date-fns'
import { clsx } from 'clsx'
import { useTaskPanelStore } from '../../stores/taskPanelStore'
import type { Category, RecurrenceConfig } from '../../types'

const RECURRENCE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'bimonthly', label: 'Bi-Monthly' },
  { value: 'asNeeded', label: 'As Needed' },
]

interface TaskFormData {
  title: string
  category_id: number | null
  recurrence_type: string
  recurrence_config: RecurrenceConfig
}

export default function TaskDetailPanel() {
  const { selectedInstance, selectedDefinition, isOpen, close } = useTaskPanelStore()
  const queryClient = useQueryClient()

  const [isEditing, setIsEditing] = useState(false)
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    category_id: null,
    recurrence_type: 'daily',
    recurrence_config: { type: 'daily', weekdaysOnly: false },
  })
  const [instanceNotes, setInstanceNotes] = useState('')

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories')
      if (!response.ok) throw new Error('Failed to fetch categories')
      const data = await response.json()
      return data.data || []
    },
  })

  // Reset form when panel opens with new data
  useEffect(() => {
    if (selectedInstance?.task_definition) {
      const def = selectedInstance.task_definition
      setFormData({
        title: def.title,
        category_id: def.category_id,
        recurrence_type: def.recurrence_type,
        recurrence_config: def.recurrence_config,
      })
      setInstanceNotes(selectedInstance.notes || '')
      setIsEditing(false)
    } else if (selectedDefinition) {
      setFormData({
        title: selectedDefinition.title,
        category_id: selectedDefinition.category_id,
        recurrence_type: selectedDefinition.recurrence_type,
        recurrence_config: selectedDefinition.recurrence_config,
      })
      setIsEditing(false)
    }
  }, [selectedInstance, selectedDefinition])

  const updateTaskMutation = useMutation({
    mutationFn: async ({ id, data }: { id: number; data: TaskFormData }) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to update task')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      setIsEditing(false)
    },
  })

  const updateInstanceMutation = useMutation({
    mutationFn: async ({ id, status, notes }: { id: number; status: string; notes?: string }) => {
      const response = await fetch(`/api/instances/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status, notes }),
      })
      if (!response.ok) throw new Error('Failed to update instance')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['instances'] })
    },
  })

  const deleteTaskMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await fetch(`/api/tasks/${id}`, {
        method: 'DELETE',
      })
      if (!response.ok) throw new Error('Failed to delete task')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      close()
    },
  })

  const handleRecurrenceTypeChange = (type: string) => {
    let config: RecurrenceConfig
    switch (type) {
      case 'daily':
        config = { type: 'daily', weekdaysOnly: false }
        break
      case 'weekly':
        config = { type: 'weekly', dayOfWeek: 1 }
        break
      case 'monthly':
        config = { type: 'monthly', dayOfMonth: 1 }
        break
      case 'quarterly':
        config = { type: 'quarterly', monthOfQuarter: 1, dayOfMonth: 1 }
        break
      case 'yearly':
        config = { type: 'yearly', month: 1, dayOfMonth: 1 }
        break
      case 'bimonthly':
        config = { type: 'bimonthly', monthParity: 'even', dayOfMonth: 1 }
        break
      case 'asNeeded':
      default:
        config = { type: 'asNeeded' }
        break
    }
    setFormData({ ...formData, recurrence_type: type, recurrence_config: config })
  }

  const handleSaveTask = () => {
    const taskId = selectedInstance?.task_definition?.id || selectedDefinition?.id
    if (taskId) {
      updateTaskMutation.mutate({ id: taskId, data: formData })
    }
  }

  const handleSaveInstanceNotes = () => {
    if (selectedInstance) {
      updateInstanceMutation.mutate({
        id: selectedInstance.id,
        status: selectedInstance.status,
        notes: instanceNotes,
      })
    }
  }

  const handleStatusChange = (status: string) => {
    if (selectedInstance) {
      updateInstanceMutation.mutate({
        id: selectedInstance.id,
        status,
        notes: instanceNotes,
      })
    }
  }

  const handleDelete = () => {
    const taskId = selectedInstance?.task_definition?.id || selectedDefinition?.id
    if (taskId && confirm('Are you sure you want to delete this task? This will also delete all associated instances.')) {
      deleteTaskMutation.mutate(taskId)
    }
  }

  const getRecurrenceLabel = (config: RecurrenceConfig) => {
    switch (config.type) {
      case 'daily':
        return config.weekdaysOnly ? 'Daily (Weekdays)' : 'Daily'
      case 'weekly':
        return 'Weekly'
      case 'monthly':
        return `Monthly (day ${config.dayOfMonth})`
      case 'bimonthly':
        return `Bi-Monthly (${config.monthParity} months)`
      case 'quarterly':
        return 'Quarterly'
      case 'yearly':
        return 'Yearly'
      case 'asNeeded':
        return 'As Needed'
      default:
        return 'Custom'
    }
  }

  const category = categories.find(
    (c) => c.id === (selectedInstance?.task_definition?.category_id || selectedDefinition?.category_id)
  )

  if (!isOpen) return null

  return (
    <>
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-black bg-opacity-30 z-40"
        onClick={close}
      />

      {/* Panel - full screen on mobile, slide-in on desktop */}
      <div className="fixed inset-0 md:inset-auto md:right-0 md:top-0 md:h-full md:w-full md:max-w-md bg-white shadow-xl z-50 flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 border-b border-gray-200">
          {/* Back button on mobile */}
          <button
            onClick={close}
            className="md:hidden p-2 -ml-2 text-gray-600 hover:text-gray-900 rounded-lg hover:bg-gray-100"
            aria-label="Go back"
          >
            <BackIcon className="w-5 h-5" />
          </button>
          <h2 className="text-lg font-semibold text-gray-900 flex-1 md:flex-none">
            {isEditing ? 'Edit Task' : 'Task Details'}
          </h2>
          {/* Close button on desktop only */}
          <button
            onClick={close}
            className="hidden md:block p-2 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100"
          >
            <CloseIcon className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-4 md:p-6">
          {isEditing ? (
            // Edit form
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Task Title
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  className="input"
                  placeholder="Enter task title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Category
                </label>
                <select
                  value={formData.category_id ?? ''}
                  onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : null })}
                  className="input"
                >
                  <option value="">Select category</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.id}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Recurrence
                </label>
                <select
                  value={formData.recurrence_type}
                  onChange={(e) => handleRecurrenceTypeChange(e.target.value)}
                  className="input"
                >
                  {RECURRENCE_TYPES.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Additional config based on recurrence type */}
              {formData.recurrence_type === 'monthly' && formData.recurrence_config.type === 'monthly' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Day of Month
                  </label>
                  <input
                    type="number"
                    min="1"
                    max="31"
                    value={formData.recurrence_config.dayOfMonth || 1}
                    onChange={(e) => setFormData({
                      ...formData,
                      recurrence_config: { type: 'monthly', dayOfMonth: parseInt(e.target.value) }
                    })}
                    className="input"
                  />
                </div>
              )}

              {formData.recurrence_type === 'yearly' && formData.recurrence_config.type === 'yearly' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Month
                    </label>
                    <select
                      value={formData.recurrence_config.month || 1}
                      onChange={(e) => setFormData({
                        ...formData,
                        recurrence_config: {
                          type: 'yearly',
                          month: parseInt(e.target.value),
                          dayOfMonth: formData.recurrence_config.type === 'yearly' ? formData.recurrence_config.dayOfMonth : 1
                        }
                      })}
                      className="input"
                    >
                      {['January', 'February', 'March', 'April', 'May', 'June',
                        'July', 'August', 'September', 'October', 'November', 'December'].map((m, i) => (
                        <option key={i} value={i + 1}>{m}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Day
                    </label>
                    <input
                      type="number"
                      min="1"
                      max="31"
                      value={formData.recurrence_config.dayOfMonth || 1}
                      onChange={(e) => setFormData({
                        ...formData,
                        recurrence_config: {
                          type: 'yearly',
                          month: formData.recurrence_config.type === 'yearly' ? formData.recurrence_config.month : 1,
                          dayOfMonth: parseInt(e.target.value)
                        }
                      })}
                      className="input"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            // View mode
            <div className="space-y-6">
              {/* Task info */}
              <div>
                <h3 className="text-xl font-semibold text-gray-900">
                  {selectedInstance?.task_definition?.title || selectedDefinition?.title}
                </h3>
                {category && (
                  <div className="flex items-center gap-2 mt-2">
                    <span
                      className="w-3 h-3 rounded-full"
                      style={{ backgroundColor: category.color }}
                    />
                    <span className="text-sm text-gray-600">{category.name}</span>
                  </div>
                )}
              </div>

              {/* Recurrence */}
              <div>
                <label className="block text-sm font-medium text-gray-500 mb-1">
                  Recurrence
                </label>
                <p className="text-gray-900">
                  {getRecurrenceLabel(
                    selectedInstance?.task_definition?.recurrence_config ||
                    selectedDefinition?.recurrence_config ||
                    { type: 'asNeeded' }
                  )}
                </p>
              </div>

              {/* Instance-specific info */}
              {selectedInstance && (
                <>
                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Scheduled Date
                    </label>
                    <p className="text-gray-900">
                      {format(new Date(selectedInstance.scheduled_date), 'EEEE, MMMM d, yyyy')}
                    </p>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Status
                    </label>
                    <div className="flex flex-wrap items-center gap-2">
                      <button
                        onClick={() => handleStatusChange('pending')}
                        className={clsx(
                          'flex-1 md:flex-none px-3 py-2.5 md:py-1.5 text-sm rounded-lg border transition-colors',
                          selectedInstance.status === 'pending'
                            ? 'bg-yellow-100 border-yellow-300 text-yellow-700'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        Pending
                      </button>
                      <button
                        onClick={() => handleStatusChange('completed')}
                        className={clsx(
                          'flex-1 md:flex-none px-3 py-2.5 md:py-1.5 text-sm rounded-lg border transition-colors',
                          selectedInstance.status === 'completed'
                            ? 'bg-green-100 border-green-300 text-green-700'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        Completed
                      </button>
                      <button
                        onClick={() => handleStatusChange('skipped')}
                        className={clsx(
                          'flex-1 md:flex-none px-3 py-2.5 md:py-1.5 text-sm rounded-lg border transition-colors',
                          selectedInstance.status === 'skipped'
                            ? 'bg-gray-200 border-gray-400 text-gray-700'
                            : 'border-gray-200 text-gray-600 hover:bg-gray-50'
                        )}
                      >
                        Skipped
                      </button>
                    </div>
                  </div>

                  {selectedInstance.status === 'completed' && selectedInstance.completed_at && (
                    <div>
                      <label className="block text-sm font-medium text-gray-500 mb-1">
                        Completed At
                      </label>
                      <p className="text-gray-900">
                        {format(new Date(selectedInstance.completed_at), 'MMMM d, yyyy h:mm a')}
                      </p>
                    </div>
                  )}

                  <div>
                    <label className="block text-sm font-medium text-gray-500 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={instanceNotes}
                      onChange={(e) => setInstanceNotes(e.target.value)}
                      placeholder="Add notes for this instance..."
                      className="input min-h-[80px]"
                    />
                    {instanceNotes !== (selectedInstance.notes || '') && (
                      <button
                        onClick={handleSaveInstanceNotes}
                        className="mt-2 btn btn-primary text-sm"
                      >
                        Save Notes
                      </button>
                    )}
                  </div>
                </>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-4 md:px-6 py-4 border-t border-gray-200 flex flex-col-reverse md:flex-row justify-between gap-3 md:gap-0">
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-700 text-sm font-medium"
          >
            Delete Task
          </button>
          <div className="flex gap-3">
            {isEditing ? (
              <>
                <button
                  onClick={() => setIsEditing(false)}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveTask}
                  disabled={updateTaskMutation.isPending}
                  className="btn btn-primary"
                >
                  {updateTaskMutation.isPending ? 'Saving...' : 'Save'}
                </button>
              </>
            ) : (
              <button
                onClick={() => setIsEditing(true)}
                className="btn btn-primary"
              >
                Edit Task Definition
              </button>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
    </svg>
  )
}

function BackIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
    </svg>
  )
}
