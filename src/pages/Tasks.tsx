import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import type { TaskDefinition, Category, RecurrenceConfig } from '../types'
import TaskForm from '../components/tasks/TaskForm'

interface TaskFormData {
  title: string
  category_id: number | null
  recurrence_type: string
  recurrence_config: RecurrenceConfig
}

export default function TasksPage() {
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null)
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<TaskDefinition | null>(null)

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
    setIsModalOpen(true)
  }

  const openEditModal = (task: TaskDefinition) => {
    setEditingTask(task)
    setIsModalOpen(true)
  }

  const closeModal = () => {
    setIsModalOpen(false)
    setEditingTask(null)
  }

  const handleFormSubmit = (data: TaskFormData) => {
    if (editingTask) {
      updateTaskMutation.mutate({ id: editingTask.id, data })
    } else {
      createTaskMutation.mutate(data)
    }
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
        if (config.weekdaysOnly) return 'Every weekday'
        if (config.interval && config.interval > 1) return `Every ${config.interval} days`
        return 'Daily'
      case 'weekly':
        const days = config.daysOfWeek?.map(d => ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][d]).join(', ')
        if (config.interval && config.interval > 1) return `Every ${config.interval} weeks (${days || getDayName(config.dayOfWeek)})`
        return `Weekly (${days || getDayName(config.dayOfWeek)})`
      case 'monthly':
        if (config.useNthWeekday) {
          const nth = ['First', 'Second', 'Third', 'Fourth', 'Last'][config.nthWeek! - 1] || ''
          const day = getDayName(config.nthDayOfWeek || 0)
          return `${nth} ${day} monthly`
        }
        if (config.interval && config.interval > 1) return `Day ${config.dayOfMonth} every ${config.interval} months`
        return `Monthly (day ${config.dayOfMonth})`
      case 'bimonthly':
        return `Bi-Monthly (${config.monthParity} months)`
      case 'quarterly':
        return 'Quarterly'
      case 'yearly':
        if (config.useNthWeekday) {
          const nth = ['First', 'Second', 'Third', 'Fourth', 'Last'][config.nthWeek! - 1] || ''
          const day = getDayName(config.nthDayOfWeek || 0)
          const month = getMonthName(config.month)
          return `${nth} ${day} of ${month}`
        }
        if (config.interval && config.interval > 1) return `Every ${config.interval} years (${getMonthName(config.month)} ${config.dayOfMonth})`
        return `Yearly (${getMonthName(config.month)} ${config.dayOfMonth})`
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
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-lg shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
            <div className="px-6 py-4 border-b border-gray-200 sticky top-0 bg-white">
              <h2 className="text-lg font-semibold text-gray-900">
                {editingTask ? 'Edit Task' : 'Add New Task'}
              </h2>
            </div>
            <div className="px-6 py-4">
              <TaskForm
                initialData={editingTask ? {
                  title: editingTask.title,
                  category_id: editingTask.category_id,
                  recurrence_type: editingTask.recurrence_type,
                  recurrence_config: editingTask.recurrence_config,
                } : undefined}
                onSubmit={handleFormSubmit}
                onCancel={closeModal}
                isSubmitting={createTaskMutation.isPending || updateTaskMutation.isPending}
                submitLabel={editingTask ? 'Update Task' : 'Create Task'}
              />
            </div>
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

function getMonthName(month: number): string {
  const months = ['January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December']
  return months[month - 1] || 'Unknown'
}
