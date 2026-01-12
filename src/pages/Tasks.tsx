import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import type { TaskDefinition, Category, RecurrenceConfig } from '../types'

interface TaskFormData {
  title: string
  category_id: number | null
  recurrence_type: string
  recurrence_config: RecurrenceConfig
}

const RECURRENCE_TYPES = [
  { value: 'daily', label: 'Daily' },
  { value: 'weekly', label: 'Weekly' },
  { value: 'monthly', label: 'Monthly' },
  { value: 'quarterly', label: 'Quarterly' },
  { value: 'yearly', label: 'Yearly' },
  { value: 'bimonthly', label: 'Bi-Monthly' },
  { value: 'asNeeded', label: 'As Needed' },
]

export default function TasksPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskDefinition | null>(null)
  const [formData, setFormData] = useState<TaskFormData>({
    title: '',
    category_id: null,
    recurrence_type: 'daily',
    recurrence_config: { type: 'daily', weekdaysOnly: false },
  })

  const queryClient = useQueryClient()

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories')
      if (!response.ok) throw new Error('Failed to fetch categories')
      const data = await response.json()
      return data.data || []
    },
  })

  const { data: tasks = [], isLoading } = useQuery<TaskDefinition[]>({
    queryKey: ['tasks'],
    queryFn: async () => {
      const response = await fetch('/api/tasks')
      if (!response.ok) throw new Error('Failed to fetch tasks')
      const data = await response.json()
      return data.data || []
    },
  })

  const createTaskMutation = useMutation({
    mutationFn: async (data: TaskFormData) => {
      const response = await fetch('/api/tasks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create task')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] })
      queryClient.invalidateQueries({ queryKey: ['instances'] })
      closeModal()
    },
  })

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
      closeModal()
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
    },
  })

  const openCreateModal = () => {
    setEditingTask(null)
    setFormData({
      title: '',
      category_id: categories[0]?.id || null,
      recurrence_type: 'daily',
      recurrence_config: { type: 'daily', weekdaysOnly: false },
    })
    setIsModalOpen(true)
  }

  const openEditModal = (task: TaskDefinition) => {
    setEditingTask(task)
    setFormData({
      title: task.title,
      category_id: task.category_id,
      recurrence_type: task.recurrence_type,
      recurrence_config: task.recurrence_config,
    })
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTask(null)
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data: formData })
    } else {
      createTaskMutation.mutate(formData)
    }
  }

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

  const filteredTasks = tasks.filter((task) => {
    const matchesSearch = task.title.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = selectedCategory === null || task.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getCategoryColor = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.color || '#6B7280'
  }

  const getCategoryName = (categoryId: number) => {
    const category = categories.find((c) => c.id === categoryId)
    return category?.name || 'Unknown'
  }

  const getRecurrenceLabel = (task: TaskDefinition) => {
    const config = task.recurrence_config
    switch (config.type) {
      case 'daily':
        return config.weekdaysOnly ? 'Daily (Weekdays)' : 'Daily'
      case 'weekly':
        return 'Weekly'
      case 'monthly':
        return 'Monthly'
      case 'bimonthly':
        return `Bi-Monthly (${config.monthParity} months)`
      case 'quarterly':
        return 'Quarterly'
      case 'yearly':
        return 'Yearly'
      case 'nthWeekday':
        return `${ordinal(config.n)} ${getDayName(config.dayOfWeek)}`
      case 'multiMonth':
        return `Months: ${config.months.join(', ')}`
      case 'multiYear':
        return `Every ${config.interval} years`
      case 'oneTime':
        return `One-time: ${config.date}`
      case 'asNeeded':
        return 'As Needed'
      case 'asOccurs':
        return 'As Occurs'
      default:
        return 'Unknown'
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-900">Task Definitions</h1>
        <button className="btn btn-primary" onClick={openCreateModal}>
          + Add Task
        </button>
      </div>

      {/* Filters */}
      <div className="card p-4">
        <div className="flex flex-wrap gap-4">
          {/* Search */}
          <div className="flex-1 min-w-[200px]">
            <input
              type="text"
              placeholder="Search tasks..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="input"
            />
          </div>

          {/* Category filter */}
          <div className="min-w-[200px]">
            <select
              value={selectedCategory ?? ''}
              onChange={(e) => setSelectedCategory(e.target.value ? Number(e.target.value) : null)}
              className="input"
            >
              <option value="">All Categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Task list */}
      <div className="card">
        {isLoading ? (
          <div className="p-8 text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
            <p className="text-gray-500 mt-2">Loading tasks...</p>
          </div>
        ) : filteredTasks.length === 0 ? (
          <div className="p-8 text-center text-gray-500">
            {tasks.length === 0
              ? 'No tasks defined yet. Import tasks from Excel or create them manually.'
              : 'No tasks match your filters.'}
          </div>
        ) : (
          <table className="w-full">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Task
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Category
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Recurrence
                </th>
                <th className="text-left px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="text-right px-4 py-3 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {filteredTasks.map((task) => (
                <tr key={task.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <span className="font-medium text-gray-900">{task.title}</span>
                  </td>
                  <td className="px-4 py-3">
                    <span className="inline-flex items-center gap-2">
                      <span
                        className="w-3 h-3 rounded-full"
                        style={{ backgroundColor: getCategoryColor(task.category_id) }}
                      />
                      <span className="text-gray-600">{getCategoryName(task.category_id)}</span>
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-600">
                    {getRecurrenceLabel(task)}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={clsx(
                        'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                        task.is_active
                          ? 'bg-green-100 text-green-700'
                          : 'bg-gray-100 text-gray-600'
                      )}
                    >
                      {task.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-right space-x-2">
                    <button
                      className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                      onClick={() => openEditModal(task)}
                    >
                      Edit
                    </button>
                    <button
                      className="text-red-600 hover:text-red-700 text-sm font-medium"
                      onClick={() => {
                        if (confirm('Are you sure you want to delete this task? This will also delete all associated instances.')) {
                          deleteTaskMutation.mutate(task.id)
                        }
                      }}
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-md mx-4">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h2>
            </div>
            <form onSubmit={handleSubmit}>
              <div className="px-6 py-4 space-y-4">
                {/* Title */}
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
                    required
                  />
                </div>

                {/* Category */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Category
                  </label>
                  <select
                    value={formData.category_id ?? ''}
                    onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : null })}
                    className="input"
                    required
                  >
                    <option value="">Select category</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Recurrence Type */}
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
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="btn btn-secondary"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={createTaskMutation.isPending || updateTaskMutation.isPending}
                  className="btn btn-primary"
                >
                  {createTaskMutation.isPending || updateTaskMutation.isPending
                    ? 'Saving...'
                    : editingTask ? 'Update Task' : 'Create Task'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

function ordinal(n: number): string {
  const s = ['th', 'st', 'nd', 'rd']
  const v = n % 100
  return n + (s[(v - 20) % 10] || s[v] || s[0])
}

function getDayName(day: number): string {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']
  return days[day] || 'Unknown'
}
