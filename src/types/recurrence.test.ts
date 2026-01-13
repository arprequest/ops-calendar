import { describe, it, expect } from 'vitest'
import type {
  DailyConfig,
  WeeklyConfig,
  MonthlyConfig,
  YearlyConfig,
  RecurrenceConfig,
  RecurrenceRange,
} from './index'

describe('Recurrence Types', () => {
  describe('DailyConfig', () => {
    it('supports basic daily recurrence', () => {
      const config: DailyConfig = {
        type: 'daily',
        weekdaysOnly: false,
      }
      expect(config.type).toBe('daily')
      expect(config.weekdaysOnly).toBe(false)
    })

    it('supports weekdays only', () => {
      const config: DailyConfig = {
        type: 'daily',
        weekdaysOnly: true,
      }
      expect(config.weekdaysOnly).toBe(true)
    })

    it('supports interval', () => {
      const config: DailyConfig = {
        type: 'daily',
        weekdaysOnly: false,
        interval: 3,
      }
      expect(config.interval).toBe(3)
    })

    it('supports range with end date', () => {
      const config: DailyConfig = {
        type: 'daily',
        weekdaysOnly: false,
        range: {
          startDate: '2024-01-01',
          endType: 'date',
          endDate: '2024-12-31',
        },
      }
      expect(config.range?.endType).toBe('date')
      expect(config.range?.endDate).toBe('2024-12-31')
    })

    it('supports range with occurrences', () => {
      const config: DailyConfig = {
        type: 'daily',
        weekdaysOnly: false,
        range: {
          endType: 'occurrences',
          occurrences: 10,
        },
      }
      expect(config.range?.endType).toBe('occurrences')
      expect(config.range?.occurrences).toBe(10)
    })
  })

  describe('WeeklyConfig', () => {
    it('supports single day selection (legacy)', () => {
      const config: WeeklyConfig = {
        type: 'weekly',
        dayOfWeek: 1, // Monday
      }
      expect(config.dayOfWeek).toBe(1)
    })

    it('supports multiple days selection', () => {
      const config: WeeklyConfig = {
        type: 'weekly',
        dayOfWeek: 1,
        daysOfWeek: [1, 3, 5], // Mon, Wed, Fri
      }
      expect(config.daysOfWeek).toEqual([1, 3, 5])
    })

    it('supports interval', () => {
      const config: WeeklyConfig = {
        type: 'weekly',
        dayOfWeek: 1,
        interval: 2, // Every 2 weeks
      }
      expect(config.interval).toBe(2)
    })
  })

  describe('MonthlyConfig', () => {
    it('supports day of month', () => {
      const config: MonthlyConfig = {
        type: 'monthly',
        dayOfMonth: 15,
      }
      expect(config.dayOfMonth).toBe(15)
    })

    it('supports nth weekday', () => {
      const config: MonthlyConfig = {
        type: 'monthly',
        dayOfMonth: 1,
        useNthWeekday: true,
        nthWeek: 2, // Second
        nthDayOfWeek: 2, // Tuesday
      }
      expect(config.useNthWeekday).toBe(true)
      expect(config.nthWeek).toBe(2)
      expect(config.nthDayOfWeek).toBe(2)
    })

    it('supports last weekday of month', () => {
      const config: MonthlyConfig = {
        type: 'monthly',
        dayOfMonth: 1,
        useNthWeekday: true,
        nthWeek: 5, // Last
        nthDayOfWeek: 5, // Friday
      }
      expect(config.nthWeek).toBe(5)
    })

    it('supports interval', () => {
      const config: MonthlyConfig = {
        type: 'monthly',
        dayOfMonth: 1,
        interval: 3, // Every 3 months
      }
      expect(config.interval).toBe(3)
    })
  })

  describe('YearlyConfig', () => {
    it('supports specific date', () => {
      const config: YearlyConfig = {
        type: 'yearly',
        month: 7, // July
        dayOfMonth: 4,
      }
      expect(config.month).toBe(7)
      expect(config.dayOfMonth).toBe(4)
    })

    it('supports nth weekday', () => {
      const config: YearlyConfig = {
        type: 'yearly',
        month: 11, // November
        dayOfMonth: 1,
        useNthWeekday: true,
        nthWeek: 4, // Fourth
        nthDayOfWeek: 4, // Thursday (Thanksgiving)
      }
      expect(config.useNthWeekday).toBe(true)
      expect(config.nthWeek).toBe(4)
      expect(config.nthDayOfWeek).toBe(4)
    })

    it('supports interval', () => {
      const config: YearlyConfig = {
        type: 'yearly',
        month: 1,
        dayOfMonth: 1,
        interval: 2, // Every 2 years
      }
      expect(config.interval).toBe(2)
    })
  })

  describe('RecurrenceRange', () => {
    it('supports never ending', () => {
      const range: RecurrenceRange = {
        endType: 'never',
      }
      expect(range.endType).toBe('never')
    })

    it('supports start date', () => {
      const range: RecurrenceRange = {
        startDate: '2024-06-01',
        endType: 'never',
      }
      expect(range.startDate).toBe('2024-06-01')
    })

    it('supports end by date', () => {
      const range: RecurrenceRange = {
        endType: 'date',
        endDate: '2025-12-31',
      }
      expect(range.endType).toBe('date')
      expect(range.endDate).toBe('2025-12-31')
    })

    it('supports end after occurrences', () => {
      const range: RecurrenceRange = {
        endType: 'occurrences',
        occurrences: 52, // About a year of weekly
      }
      expect(range.endType).toBe('occurrences')
      expect(range.occurrences).toBe(52)
    })
  })

  describe('RecurrenceConfig union type', () => {
    it('handles all config types', () => {
      const configs: RecurrenceConfig[] = [
        { type: 'daily', weekdaysOnly: false },
        { type: 'weekly', dayOfWeek: 1 },
        { type: 'monthly', dayOfMonth: 15 },
        { type: 'yearly', month: 1, dayOfMonth: 1 },
        { type: 'bimonthly', monthParity: 'even', dayOfMonth: 1 },
        { type: 'quarterly', monthOfQuarter: 1, dayOfMonth: 1 },
        { type: 'asNeeded' },
        { type: 'asOccurs' },
      ]

      expect(configs).toHaveLength(8)
      configs.forEach((config) => {
        expect(config.type).toBeDefined()
      })
    })
  })
})
