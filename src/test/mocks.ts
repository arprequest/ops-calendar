import type { Category, TaskDefinition, TaskInstance } from '../types'

export const mockCategories: Category[] = [
  { id: 1, name: 'Water Sampling', color: '#3B82F6', sort_order: 1 },
  { id: 2, name: 'Billing', color: '#10B981', sort_order: 2 },
  { id: 3, name: 'Maintenance', color: '#F59E0B', sort_order: 3 },
]

export const mockTaskDefinitions: TaskDefinition[] = [
  {
    id: 1,
    category_id: 1,
    title: 'Chlorine Residual',
    description: 'Check chlorine levels',
    recurrence_type: 'daily',
    recurrence_config: { type: 'daily', weekdaysOnly: false },
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 2,
    category_id: 2,
    title: 'Record Payments',
    description: 'Record daily payments',
    recurrence_type: 'daily',
    recurrence_config: { type: 'daily', weekdaysOnly: true },
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
  {
    id: 3,
    category_id: 3,
    title: 'System Rounds',
    description: 'Weekly system inspection',
    recurrence_type: 'weekly',
    recurrence_config: { type: 'weekly', dayOfWeek: 1 },
    is_active: true,
    created_at: '2024-01-01T00:00:00Z',
    updated_at: '2024-01-01T00:00:00Z',
  },
]

export const mockTaskInstances: TaskInstance[] = [
  {
    id: 1,
    task_definition_id: 1,
    scheduled_date: '2024-01-15',
    status: 'pending',
    completed_at: null,
    completed_by: null,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    task_definition: mockTaskDefinitions[0],
  },
  {
    id: 2,
    task_definition_id: 2,
    scheduled_date: '2024-01-15',
    status: 'completed',
    completed_at: '2024-01-15T10:30:00Z',
    completed_by: 1,
    notes: 'All payments recorded',
    created_at: '2024-01-01T00:00:00Z',
    task_definition: mockTaskDefinitions[1],
  },
  {
    id: 3,
    task_definition_id: 1,
    scheduled_date: '2024-01-14',
    status: 'pending',
    completed_at: null,
    completed_by: null,
    notes: null,
    created_at: '2024-01-01T00:00:00Z',
    task_definition: mockTaskDefinitions[0],
  },
]

export const mockUser = {
  id: 1,
  username: 'testuser',
  role: 'admin' as const,
  created_at: '2024-01-01T00:00:00Z',
}

// Helper to create mock fetch responses
export function mockFetchResponse<T>(data: T, success = true) {
  return Promise.resolve({
    ok: success,
    json: () => Promise.resolve({ success, data }),
  } as Response)
}

export function mockFetchError(error: string) {
  return Promise.resolve({
    ok: false,
    json: () => Promise.resolve({ success: false, error }),
  } as Response)
}
