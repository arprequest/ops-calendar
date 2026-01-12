import { create } from 'zustand'
import { startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns'
import type { CalendarView } from '../types'

interface CalendarState {
  currentDate: Date
  view: CalendarView
  selectedCategories: number[]
  setCurrentDate: (date: Date) => void
  setView: (view: CalendarView) => void
  toggleCategory: (categoryId: number) => void
  setSelectedCategories: (categories: number[]) => void
  goToToday: () => void
  navigatePrev: () => void
  navigateNext: () => void
}

export const useCalendarStore = create<CalendarState>((set, get) => ({
  currentDate: startOfDay(new Date()),
  view: 'daily',
  selectedCategories: [],

  setCurrentDate: (date) => set({ currentDate: startOfDay(date) }),

  setView: (view) => set({ view }),

  toggleCategory: (categoryId) => {
    const { selectedCategories } = get()
    if (selectedCategories.includes(categoryId)) {
      set({ selectedCategories: selectedCategories.filter((id) => id !== categoryId) })
    } else {
      set({ selectedCategories: [...selectedCategories, categoryId] })
    }
  },

  setSelectedCategories: (categories) => set({ selectedCategories: categories }),

  goToToday: () => set({ currentDate: startOfDay(new Date()) }),

  navigatePrev: () => {
    const { currentDate, view } = get()
    let newDate: Date

    switch (view) {
      case 'daily':
        newDate = new Date(currentDate)
        newDate.setDate(newDate.getDate() - 1)
        break
      case 'weekly':
        newDate = new Date(currentDate)
        newDate.setDate(newDate.getDate() - 7)
        break
      case 'monthly':
        newDate = new Date(currentDate)
        newDate.setMonth(newDate.getMonth() - 1)
        break
      case 'yearly':
        newDate = new Date(currentDate)
        newDate.setFullYear(newDate.getFullYear() - 1)
        break
      default:
        newDate = currentDate
    }

    set({ currentDate: startOfDay(newDate) })
  },

  navigateNext: () => {
    const { currentDate, view } = get()
    let newDate: Date

    switch (view) {
      case 'daily':
        newDate = new Date(currentDate)
        newDate.setDate(newDate.getDate() + 1)
        break
      case 'weekly':
        newDate = new Date(currentDate)
        newDate.setDate(newDate.getDate() + 7)
        break
      case 'monthly':
        newDate = new Date(currentDate)
        newDate.setMonth(newDate.getMonth() + 1)
        break
      case 'yearly':
        newDate = new Date(currentDate)
        newDate.setFullYear(newDate.getFullYear() + 1)
        break
      default:
        newDate = currentDate
    }

    set({ currentDate: startOfDay(newDate) })
  },
}))

// Helper to get the date range for the current view
export function getDateRange(date: Date, view: CalendarView): { start: Date; end: Date } {
  switch (view) {
    case 'daily':
      return {
        start: startOfDay(date),
        end: startOfDay(date),
      }
    case 'weekly': {
      const weekStart = startOfWeek(date, { weekStartsOn: 0 })
      const weekEnd = new Date(weekStart)
      weekEnd.setDate(weekEnd.getDate() + 6)
      return { start: weekStart, end: weekEnd }
    }
    case 'monthly': {
      const monthStart = startOfMonth(date)
      const monthEnd = new Date(monthStart)
      monthEnd.setMonth(monthEnd.getMonth() + 1)
      monthEnd.setDate(0) // Last day of current month
      return { start: monthStart, end: monthEnd }
    }
    case 'yearly': {
      const yearStart = startOfYear(date)
      const yearEnd = new Date(yearStart)
      yearEnd.setFullYear(yearEnd.getFullYear() + 1)
      yearEnd.setDate(0) // Last day of year
      return { start: yearStart, end: yearEnd }
    }
  }
}
