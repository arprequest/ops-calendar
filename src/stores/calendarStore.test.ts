import { describe, it, expect, beforeEach } from 'vitest'
import { useCalendarStore, getDateRange } from './calendarStore'

// Helper to create local dates without timezone issues
function createLocalDate(year: number, month: number, day: number): Date {
  return new Date(year, month - 1, day)
}

describe('calendarStore', () => {
  beforeEach(() => {
    // Reset store to initial state using local date
    useCalendarStore.setState({
      currentDate: createLocalDate(2024, 1, 15),
      view: 'daily',
      selectedCategories: [],
    })
  })

  describe('setCurrentDate', () => {
    it('updates the current date', () => {
      const newDate = createLocalDate(2024, 6, 15)
      useCalendarStore.getState().setCurrentDate(newDate)
      expect(useCalendarStore.getState().currentDate.getDate()).toBe(15)
      expect(useCalendarStore.getState().currentDate.getMonth()).toBe(5) // June
    })

    it('normalizes date to start of day', () => {
      const dateWithTime = new Date('2024-06-15T14:30:00')
      useCalendarStore.getState().setCurrentDate(dateWithTime)
      expect(useCalendarStore.getState().currentDate.getHours()).toBe(0)
      expect(useCalendarStore.getState().currentDate.getMinutes()).toBe(0)
    })
  })

  describe('setView', () => {
    it('updates the calendar view', () => {
      useCalendarStore.getState().setView('weekly')
      expect(useCalendarStore.getState().view).toBe('weekly')

      useCalendarStore.getState().setView('monthly')
      expect(useCalendarStore.getState().view).toBe('monthly')
    })
  })

  describe('toggleCategory', () => {
    it('adds category when not selected', () => {
      useCalendarStore.getState().toggleCategory(1)
      expect(useCalendarStore.getState().selectedCategories).toContain(1)
    })

    it('removes category when already selected', () => {
      useCalendarStore.setState({ selectedCategories: [1, 2, 3] })
      useCalendarStore.getState().toggleCategory(2)
      expect(useCalendarStore.getState().selectedCategories).not.toContain(2)
      expect(useCalendarStore.getState().selectedCategories).toEqual([1, 3])
    })
  })

  describe('setSelectedCategories', () => {
    it('replaces all selected categories', () => {
      useCalendarStore.getState().setSelectedCategories([1, 2, 3])
      expect(useCalendarStore.getState().selectedCategories).toEqual([1, 2, 3])

      useCalendarStore.getState().setSelectedCategories([5])
      expect(useCalendarStore.getState().selectedCategories).toEqual([5])
    })
  })

  describe('goToToday', () => {
    it('sets current date to today', () => {
      const oldDate = new Date('2020-01-01')
      useCalendarStore.setState({ currentDate: oldDate })

      useCalendarStore.getState().goToToday()

      const state = useCalendarStore.getState()
      const today = new Date()
      expect(state.currentDate.getFullYear()).toBe(today.getFullYear())
      expect(state.currentDate.getMonth()).toBe(today.getMonth())
      expect(state.currentDate.getDate()).toBe(today.getDate())
    })
  })

  describe('navigatePrev', () => {
    it('goes back 1 day in daily view', () => {
      useCalendarStore.setState({
        currentDate: createLocalDate(2024, 1, 15),
        view: 'daily',
      })

      useCalendarStore.getState().navigatePrev()
      expect(useCalendarStore.getState().currentDate.getDate()).toBe(14)
    })

    it('goes back 7 days in weekly view', () => {
      useCalendarStore.setState({
        currentDate: createLocalDate(2024, 1, 15),
        view: 'weekly',
      })

      useCalendarStore.getState().navigatePrev()
      expect(useCalendarStore.getState().currentDate.getDate()).toBe(8)
    })

    it('goes back 1 month in monthly view', () => {
      useCalendarStore.setState({
        currentDate: createLocalDate(2024, 2, 15),
        view: 'monthly',
      })

      useCalendarStore.getState().navigatePrev()
      expect(useCalendarStore.getState().currentDate.getMonth()).toBe(0) // January
    })

    it('goes back 1 year in yearly view', () => {
      useCalendarStore.setState({
        currentDate: createLocalDate(2024, 6, 15),
        view: 'yearly',
      })

      useCalendarStore.getState().navigatePrev()
      expect(useCalendarStore.getState().currentDate.getFullYear()).toBe(2023)
    })
  })

  describe('navigateNext', () => {
    it('goes forward 1 day in daily view', () => {
      useCalendarStore.setState({
        currentDate: createLocalDate(2024, 1, 15),
        view: 'daily',
      })

      useCalendarStore.getState().navigateNext()
      expect(useCalendarStore.getState().currentDate.getDate()).toBe(16)
    })

    it('goes forward 7 days in weekly view', () => {
      useCalendarStore.setState({
        currentDate: createLocalDate(2024, 1, 15),
        view: 'weekly',
      })

      useCalendarStore.getState().navigateNext()
      expect(useCalendarStore.getState().currentDate.getDate()).toBe(22)
    })

    it('goes forward 1 month in monthly view', () => {
      useCalendarStore.setState({
        currentDate: createLocalDate(2024, 1, 15),
        view: 'monthly',
      })

      useCalendarStore.getState().navigateNext()
      expect(useCalendarStore.getState().currentDate.getMonth()).toBe(1) // February
    })

    it('goes forward 1 year in yearly view', () => {
      useCalendarStore.setState({
        currentDate: createLocalDate(2024, 6, 15),
        view: 'yearly',
      })

      useCalendarStore.getState().navigateNext()
      expect(useCalendarStore.getState().currentDate.getFullYear()).toBe(2025)
    })
  })
})

describe('getDateRange', () => {
  it('returns same date for daily view', () => {
    const date = createLocalDate(2024, 1, 15)
    const range = getDateRange(date, 'daily')

    expect(range.start.getDate()).toBe(15)
    expect(range.end.getDate()).toBe(15)
  })

  it('returns week range for weekly view', () => {
    const date = createLocalDate(2024, 1, 15) // Monday
    const range = getDateRange(date, 'weekly')

    // Should start on Sunday (week starts on 0)
    expect(range.start.getDay()).toBe(0)
    // Should span 7 days
    const diffDays = Math.round((range.end.getTime() - range.start.getTime()) / (1000 * 60 * 60 * 24))
    expect(diffDays).toBe(6)
  })

  it('returns month range for monthly view', () => {
    const date = createLocalDate(2024, 1, 15)
    const range = getDateRange(date, 'monthly')

    expect(range.start.getDate()).toBe(1)
    expect(range.start.getMonth()).toBe(0) // January
    expect(range.end.getDate()).toBe(31) // January has 31 days
    expect(range.end.getMonth()).toBe(0) // January
  })

  it('returns year range for yearly view', () => {
    const date = createLocalDate(2024, 6, 15)
    const range = getDateRange(date, 'yearly')

    expect(range.start.getMonth()).toBe(0) // January
    expect(range.start.getDate()).toBe(1)
    expect(range.end.getMonth()).toBe(11) // December
    expect(range.end.getDate()).toBe(31)
  })
})
