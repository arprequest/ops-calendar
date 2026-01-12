// User types
export interface User {
  id: number
  username: string
  role: 'admin' | 'user'
  created_at: string
}

// Category types
export interface Category {
  id: number
  name: string
  color: string
  sort_order: number
}

// Recurrence configuration types
export type RecurrenceType =
  | 'daily'
  | 'weekly'
  | 'monthly'
  | 'bimonthly'
  | 'quarterly'
  | 'yearly'
  | 'nthWeekday'
  | 'multiMonth'
  | 'multiYear'
  | 'oneTime'
  | 'asNeeded'
  | 'asOccurs'

// Common recurrence range options
export interface RecurrenceRange {
  startDate?: string // ISO date string for when recurrence begins
  endType: 'never' | 'date' | 'occurrences'
  endDate?: string // ISO date string (if endType is 'date')
  occurrences?: number // Number of occurrences (if endType is 'occurrences')
}

export interface DailyConfig {
  type: 'daily'
  weekdaysOnly: boolean
  interval?: number // Every X days (default 1)
  range?: RecurrenceRange
}

export interface WeeklyConfig {
  type: 'weekly'
  dayOfWeek: number // 0-6, Sunday = 0 (legacy, single day)
  daysOfWeek?: number[] // Array of days (0-6) for multiple day selection
  interval?: number // Every X weeks (default 1)
  range?: RecurrenceRange
}

export interface MonthlyConfig {
  type: 'monthly'
  dayOfMonth: number // 1-31
  interval?: number // Every X months (default 1)
  // Alternative: nth weekday of month
  useNthWeekday?: boolean
  nthWeek?: number // 1-4 for first-fourth, 5 for last
  nthDayOfWeek?: number // 0-6
  range?: RecurrenceRange
}

export interface BimonthlyConfig {
  type: 'bimonthly'
  monthParity: 'even' | 'odd'
  dayOfMonth: number
}

export interface QuarterlyConfig {
  type: 'quarterly'
  monthOfQuarter: number // 1-3
  dayOfMonth: number
}

export interface YearlyConfig {
  type: 'yearly'
  month: number // 1-12
  dayOfMonth: number
  interval?: number // Every X years (default 1)
  // Alternative: nth weekday of month
  useNthWeekday?: boolean
  nthWeek?: number // 1-4 for first-fourth, 5 for last
  nthDayOfWeek?: number // 0-6
  range?: RecurrenceRange
}

export interface NthWeekdayConfig {
  type: 'nthWeekday'
  n: number // 1-5 (1st, 2nd, 3rd, 4th, last)
  dayOfWeek: number // 0-6
  month?: number // 1-12, optional (every month if not specified)
}

export interface MultiMonthConfig {
  type: 'multiMonth'
  months: number[] // Array of months 1-12
  dayOfMonth: number
}

export interface MultiYearConfig {
  type: 'multiYear'
  interval: number // Every N years
  baseYear: number // Starting year
  month: number
  dayOfMonth: number
}

export interface OneTimeConfig {
  type: 'oneTime'
  date: string // ISO date string
}

export interface AsNeededConfig {
  type: 'asNeeded'
}

export interface AsOccursConfig {
  type: 'asOccurs'
}

export type RecurrenceConfig =
  | DailyConfig
  | WeeklyConfig
  | MonthlyConfig
  | BimonthlyConfig
  | QuarterlyConfig
  | YearlyConfig
  | NthWeekdayConfig
  | MultiMonthConfig
  | MultiYearConfig
  | OneTimeConfig
  | AsNeededConfig
  | AsOccursConfig

// Task definition (template)
export interface TaskDefinition {
  id: number
  category_id: number
  title: string
  description: string | null
  recurrence_type: RecurrenceType
  recurrence_config: RecurrenceConfig
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined data
  category?: Category
}

// Task instance (scheduled occurrence)
export type TaskStatus = 'pending' | 'completed' | 'skipped'

export interface TaskInstance {
  id: number
  task_definition_id: number
  scheduled_date: string // ISO date
  status: TaskStatus
  completed_at: string | null
  completed_by: number | null
  notes: string | null
  created_at: string
  // Joined data
  task_definition?: TaskDefinition
  category?: Category
}

// API response types
export interface ApiResponse<T> {
  success: boolean
  data?: T
  error?: string
}

// View types
export type CalendarView = 'daily' | 'weekly' | 'monthly' | 'yearly'

// Default category colors
export const CATEGORY_COLORS: Record<string, string> = {
  'Water Sampling': '#3B82F6', // Blue
  'Billing': '#10B981', // Green
  'Maintenance and Repairs': '#F59E0B', // Orange
  'General Administration': '#8B5CF6', // Purple
  'Reporting': '#EC4899', // Pink
  'Renewals': '#EF4444', // Red
  'Planning': '#06B6D4', // Cyan
  'Conferences & Meetings': '#84CC16', // Lime
}
