import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import type { Category, RecurrenceConfig, RecurrenceRange } from '../../types'

interface TaskFormData {
  title: string
  category_id: number | null
  recurrence_type: string
  recurrence_config: RecurrenceConfig
}

interface TaskFormProps {
  initialData?: TaskFormData
  onSubmit: (data: TaskFormData) => void
  onCancel: () => void
  isSubmitting?: boolean
  submitLabel?: string
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

const DAYS_OF_WEEK = [
  { value: 0, label: 'Sunday', short: 'S' },
  { value: 1, label: 'Monday', short: 'M' },
  { value: 2, label: 'Tuesday', short: 'T' },
  { value: 3, label: 'Wednesday', short: 'W' },
  { value: 4, label: 'Thursday', short: 'T' },
  { value: 5, label: 'Friday', short: 'F' },
  { value: 6, label: 'Saturday', short: 'S' },
]

const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
]

const NTH_WEEK_OPTIONS = [
  { value: 1, label: 'First' },
  { value: 2, label: 'Second' },
  { value: 3, label: 'Third' },
  { value: 4, label: 'Fourth' },
  { value: 5, label: 'Last' },
]


export default function TaskForm({
  initialData,
  onSubmit,
  onCancel,
  isSubmitting = false,
  submitLabel = 'Save',
}: TaskFormProps) {
  const queryClient = useQueryClient()

  // Form state
  const [formData, setFormData] = useState<TaskFormData>(
    initialData || {
      title: '',
      category_id: null,
      recurrence_type: 'daily',
      recurrence_config: { type: 'daily', weekdaysOnly: false },
    }
  )

  // Category creation state
  const [isCreatingCategory, setIsCreatingCategory] = useState(false)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [newCategoryColor, setNewCategoryColor] = useState('#3B82F6')

  // Recurrence range state (extracted for easier handling)
  const [rangeStartDate, setRangeStartDate] = useState(
    (formData.recurrence_config as any).range?.startDate || ''
  )
  const [rangeEndType, setRangeEndType] = useState<'never' | 'date' | 'occurrences'>(
    (formData.recurrence_config as any).range?.endType || 'never'
  )
  const [rangeEndDate, setRangeEndDate] = useState(
    (formData.recurrence_config as any).range?.endDate || ''
  )
  const [rangeOccurrences, setRangeOccurrences] = useState(
    (formData.recurrence_config as any).range?.occurrences || 10
  )

  const { data: categories = [] } = useQuery<Category[]>({
    queryKey: ['categories'],
    queryFn: async () => {
      const response = await fetch('/api/categories')
      if (!response.ok) throw new Error('Failed to fetch categories')
      const data = await response.json()
      return data.data || []
    },
  })

  const createCategoryMutation = useMutation({
    mutationFn: async (data: { name: string; color: string }) => {
      const response = await fetch('/api/categories', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create category')
      return response.json()
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: ['categories'] })
      if (result.data?.id) {
        setFormData({ ...formData, category_id: result.data.id })
      }
      setIsCreatingCategory(false)
      setNewCategoryName('')
    },
  })

  // Build the range object
  const buildRange = (): RecurrenceRange | undefined => {
    if (!rangeStartDate && rangeEndType === 'never') {
      return undefined
    }
    return {
      startDate: rangeStartDate || undefined,
      endType: rangeEndType,
      endDate: rangeEndType === 'date' ? rangeEndDate : undefined,
      occurrences: rangeEndType === 'occurrences' ? rangeOccurrences : undefined,
    }
  }

  const handleRecurrenceTypeChange = (type: string) => {
    let config: RecurrenceConfig
    const range = buildRange()

    switch (type) {
      case 'daily':
        config = { type: 'daily', weekdaysOnly: false, interval: 1, range }
        break
      case 'weekly':
        config = { type: 'weekly', dayOfWeek: 1, daysOfWeek: [1], interval: 1, range }
        break
      case 'monthly':
        config = { type: 'monthly', dayOfMonth: 1, interval: 1, range }
        break
      case 'quarterly':
        config = { type: 'quarterly', monthOfQuarter: 1, dayOfMonth: 1 }
        break
      case 'yearly':
        config = { type: 'yearly', month: 1, dayOfMonth: 1, interval: 1, range }
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

  const updateConfig = (updates: Partial<RecurrenceConfig>) => {
    setFormData({
      ...formData,
      recurrence_config: { ...formData.recurrence_config, ...updates } as RecurrenceConfig,
    })
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    // Add range to config before submitting
    const range = buildRange()
    const finalConfig = { ...formData.recurrence_config }
    if (range && 'range' in finalConfig) {
      (finalConfig as any).range = range
    }

    onSubmit({
      ...formData,
      recurrence_config: finalConfig,
    })
  }

  const config = formData.recurrence_config

  return (
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Task Title <span className="text-red-500">*</span>
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
          Category <span className="text-red-500">*</span>
        </label>
        {isCreatingCategory ? (
          <div className="space-y-3 p-3 bg-gray-50 rounded-lg">
            <div>
              <input
                type="text"
                value={newCategoryName}
                onChange={(e) => setNewCategoryName(e.target.value)}
                className="input"
                placeholder="New category name"
                autoFocus
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-sm text-gray-600">Color:</label>
              <input
                type="color"
                value={newCategoryColor}
                onChange={(e) => setNewCategoryColor(e.target.value)}
                className="w-10 h-10 rounded cursor-pointer"
              />
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsCreatingCategory(false)}
                className="btn btn-secondary text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => createCategoryMutation.mutate({ name: newCategoryName, color: newCategoryColor })}
                disabled={!newCategoryName || createCategoryMutation.isPending}
                className="btn btn-primary text-sm"
              >
                {createCategoryMutation.isPending ? 'Creating...' : 'Create'}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex gap-2">
            <select
              value={formData.category_id ?? ''}
              onChange={(e) => setFormData({ ...formData, category_id: e.target.value ? Number(e.target.value) : null })}
              className="input flex-1"
              required
            >
              <option value="">Select category</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={() => setIsCreatingCategory(true)}
              className="btn btn-secondary text-sm whitespace-nowrap"
            >
              + New
            </button>
          </div>
        )}
      </div>

      {/* Recurrence Type */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Recurrence Pattern
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

      {/* Daily Options */}
      {config.type === 'daily' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-2">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="dailyType"
                checked={!config.weekdaysOnly}
                onChange={() => updateConfig({ weekdaysOnly: false })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm">
                Every{' '}
                <input
                  type="number"
                  min="1"
                  max="365"
                  value={config.interval || 1}
                  onChange={(e) => updateConfig({ interval: parseInt(e.target.value) || 1 })}
                  className="w-16 px-2 py-1 border rounded mx-1 text-center"
                  disabled={config.weekdaysOnly}
                />{' '}
                day(s)
              </span>
            </label>
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="dailyType"
                checked={config.weekdaysOnly}
                onChange={() => updateConfig({ weekdaysOnly: true, interval: 1 })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm">Every weekday (Monday to Friday)</span>
            </label>
          </div>
        </div>
      )}

      {/* Weekly Options */}
      {config.type === 'weekly' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm">
            <span>Recur every</span>
            <input
              type="number"
              min="1"
              max="52"
              value={config.interval || 1}
              onChange={(e) => updateConfig({ interval: parseInt(e.target.value) || 1 })}
              className="w-16 px-2 py-1 border rounded text-center"
            />
            <span>week(s) on:</span>
          </div>
          <div className="flex gap-2">
            {DAYS_OF_WEEK.map((day) => {
              const isSelected = config.daysOfWeek?.includes(day.value) || config.dayOfWeek === day.value
              return (
                <button
                  key={day.value}
                  type="button"
                  onClick={() => {
                    const current = config.daysOfWeek || [config.dayOfWeek]
                    let newDays: number[]
                    if (current.includes(day.value)) {
                      newDays = current.filter((d) => d !== day.value)
                      if (newDays.length === 0) newDays = [day.value] // Keep at least one
                    } else {
                      newDays = [...current, day.value].sort()
                    }
                    updateConfig({ daysOfWeek: newDays, dayOfWeek: newDays[0] })
                  }}
                  className={clsx(
                    'w-10 h-10 rounded-full text-sm font-medium transition-colors',
                    isSelected
                      ? 'bg-blue-600 text-white'
                      : 'bg-white border border-gray-300 text-gray-700 hover:border-blue-500'
                  )}
                  title={day.label}
                >
                  {day.short}
                </button>
              )
            })}
          </div>
        </div>
      )}

      {/* Monthly Options */}
      {config.type === 'monthly' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="monthlyType"
                checked={!config.useNthWeekday}
                onChange={() => updateConfig({ useNthWeekday: false })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm flex items-center gap-1">
                Day
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={config.dayOfMonth || 1}
                  onChange={(e) => updateConfig({ dayOfMonth: parseInt(e.target.value) || 1 })}
                  className="w-16 px-2 py-1 border rounded mx-1 text-center"
                  disabled={config.useNthWeekday}
                />
                of every
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={config.interval || 1}
                  onChange={(e) => updateConfig({ interval: parseInt(e.target.value) || 1 })}
                  className="w-16 px-2 py-1 border rounded mx-1 text-center"
                  disabled={config.useNthWeekday}
                />
                month(s)
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="radio"
                name="monthlyType"
                checked={config.useNthWeekday || false}
                onChange={() => updateConfig({ useNthWeekday: true, nthWeek: 1, nthDayOfWeek: 1 })}
                className="w-4 h-4 text-blue-600 mt-1"
              />
              <span className="text-sm flex flex-wrap items-center gap-1">
                The
                <select
                  value={config.nthWeek || 1}
                  onChange={(e) => updateConfig({ nthWeek: parseInt(e.target.value) })}
                  className="px-2 py-1 border rounded"
                  disabled={!config.useNthWeekday}
                >
                  {NTH_WEEK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={config.nthDayOfWeek || 1}
                  onChange={(e) => updateConfig({ nthDayOfWeek: parseInt(e.target.value) })}
                  className="px-2 py-1 border rounded"
                  disabled={!config.useNthWeekday}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
                of every
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={config.interval || 1}
                  onChange={(e) => updateConfig({ interval: parseInt(e.target.value) || 1 })}
                  className="w-16 px-2 py-1 border rounded text-center"
                  disabled={!config.useNthWeekday}
                />
                month(s)
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Yearly Options */}
      {config.type === 'yearly' && (
        <div className="space-y-4 p-4 bg-gray-50 rounded-lg">
          <div className="flex items-center gap-2 text-sm mb-3">
            <span>Recur every</span>
            <input
              type="number"
              min="1"
              max="10"
              value={config.interval || 1}
              onChange={(e) => updateConfig({ interval: parseInt(e.target.value) || 1 })}
              className="w-16 px-2 py-1 border rounded text-center"
            />
            <span>year(s)</span>
          </div>

          <div className="space-y-3">
            <label className="flex items-center gap-3">
              <input
                type="radio"
                name="yearlyType"
                checked={!config.useNthWeekday}
                onChange={() => updateConfig({ useNthWeekday: false })}
                className="w-4 h-4 text-blue-600"
              />
              <span className="text-sm flex items-center gap-1">
                On:
                <select
                  value={config.month || 1}
                  onChange={(e) => updateConfig({ month: parseInt(e.target.value) })}
                  className="px-2 py-1 border rounded"
                  disabled={config.useNthWeekday}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
                <input
                  type="number"
                  min="1"
                  max="31"
                  value={config.dayOfMonth || 1}
                  onChange={(e) => updateConfig({ dayOfMonth: parseInt(e.target.value) || 1 })}
                  className="w-16 px-2 py-1 border rounded text-center"
                  disabled={config.useNthWeekday}
                />
              </span>
            </label>

            <label className="flex items-start gap-3">
              <input
                type="radio"
                name="yearlyType"
                checked={config.useNthWeekday || false}
                onChange={() => updateConfig({ useNthWeekday: true, nthWeek: 1, nthDayOfWeek: 1 })}
                className="w-4 h-4 text-blue-600 mt-1"
              />
              <span className="text-sm flex flex-wrap items-center gap-1">
                The
                <select
                  value={config.nthWeek || 1}
                  onChange={(e) => updateConfig({ nthWeek: parseInt(e.target.value) })}
                  className="px-2 py-1 border rounded"
                  disabled={!config.useNthWeekday}
                >
                  {NTH_WEEK_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
                <select
                  value={config.nthDayOfWeek || 1}
                  onChange={(e) => updateConfig({ nthDayOfWeek: parseInt(e.target.value) })}
                  className="px-2 py-1 border rounded"
                  disabled={!config.useNthWeekday}
                >
                  {DAYS_OF_WEEK.map((day) => (
                    <option key={day.value} value={day.value}>{day.label}</option>
                  ))}
                </select>
                of
                <select
                  value={config.month || 1}
                  onChange={(e) => updateConfig({ month: parseInt(e.target.value) })}
                  className="px-2 py-1 border rounded"
                  disabled={!config.useNthWeekday}
                >
                  {MONTHS.map((m, i) => (
                    <option key={i} value={i + 1}>{m}</option>
                  ))}
                </select>
              </span>
            </label>
          </div>
        </div>
      )}

      {/* Recurrence Range (Start/End) - for patterns that support it */}
      {['daily', 'weekly', 'monthly', 'yearly'].includes(config.type) && (
        <div className="space-y-4 p-4 bg-blue-50 rounded-lg">
          <h4 className="text-sm font-medium text-gray-700">Range of Recurrence</h4>

          <div>
            <label className="block text-sm text-gray-600 mb-1">Start Date</label>
            <input
              type="date"
              value={rangeStartDate}
              onChange={(e) => setRangeStartDate(e.target.value)}
              className="input"
            />
            <p className="text-xs text-gray-500 mt-1">Leave empty to start immediately</p>
          </div>

          <div className="space-y-2">
            <label className="block text-sm text-gray-600">End</label>
            <div className="space-y-2">
              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="endType"
                  checked={rangeEndType === 'never'}
                  onChange={() => setRangeEndType('never')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm">No end date</span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="endType"
                  checked={rangeEndType === 'date'}
                  onChange={() => setRangeEndType('date')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm flex items-center gap-2">
                  End by:
                  <input
                    type="date"
                    value={rangeEndDate}
                    onChange={(e) => setRangeEndDate(e.target.value)}
                    className="px-2 py-1 border rounded"
                    disabled={rangeEndType !== 'date'}
                  />
                </span>
              </label>

              <label className="flex items-center gap-3">
                <input
                  type="radio"
                  name="endType"
                  checked={rangeEndType === 'occurrences'}
                  onChange={() => setRangeEndType('occurrences')}
                  className="w-4 h-4 text-blue-600"
                />
                <span className="text-sm flex items-center gap-2">
                  End after
                  <input
                    type="number"
                    min="1"
                    max="999"
                    value={rangeOccurrences}
                    onChange={(e) => setRangeOccurrences(parseInt(e.target.value) || 10)}
                    className="w-20 px-2 py-1 border rounded text-center"
                    disabled={rangeEndType !== 'occurrences'}
                  />
                  occurrences
                </span>
              </label>
            </div>
          </div>
        </div>
      )}

      {/* Form Actions */}
      <div className="flex justify-end gap-3 pt-2">
        <button
          type="button"
          onClick={onCancel}
          className="btn btn-secondary"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting || !formData.title || !formData.category_id}
          className="btn btn-primary"
        >
          {isSubmitting ? 'Saving...' : submitLabel}
        </button>
      </div>
    </form>
  )
}
