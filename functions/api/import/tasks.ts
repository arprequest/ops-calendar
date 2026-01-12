interface Env {
  DB: D1Database
}

interface ParsedTask {
  category: string
  title: string
  when: string
}

interface RecurrenceConfig {
  type: string
  [key: string]: unknown
}

// Month name to number mapping (both full and abbreviated)
const MONTH_MAP: Record<string, number> = {
  january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
  july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
  jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
}

// Parse the "When" field into recurrence configuration
function parseRecurrence(when: string): { type: string; config: RecurrenceConfig } {
  const w = when.toLowerCase().trim()

  // Daily
  if (w === 'daily') {
    return { type: 'daily', config: { type: 'daily', weekdaysOnly: false } }
  }

  // Weekly
  if (w === 'weekly') {
    return { type: 'weekly', config: { type: 'weekly', dayOfWeek: 1 } } // Monday default
  }

  // Monthly
  if (w === 'monthly') {
    return { type: 'monthly', config: { type: 'monthly', dayOfMonth: 1 } }
  }

  // Bi-Monthly
  if (w === 'bi-monthly' || w.includes('even months') || w.includes('odd months')) {
    const parity = w.includes('odd') ? 'odd' : 'even'
    return { type: 'bimonthly', config: { type: 'bimonthly', monthParity: parity, dayOfMonth: 1 } }
  }

  // Quarterly
  if (w === 'quarterly') {
    return { type: 'quarterly', config: { type: 'quarterly', monthOfQuarter: 1, dayOfMonth: 1 } }
  }

  // Specific day of month (e.g., "10th of Month")
  const nthOfMonthMatch = w.match(/(\d+)(?:st|nd|rd|th)\s+of\s+month/i)
  if (nthOfMonthMatch) {
    return {
      type: 'monthly',
      config: { type: 'monthly', dayOfMonth: parseInt(nthOfMonthMatch[1]) },
    }
  }

  // Multi-year (e.g., "Every 3 years", "Every 9 Yrs")
  const multiYearMatch = w.match(/every\s+(\d+)\s*(?:years?|yrs?)/i)
  if (multiYearMatch) {
    return {
      type: 'multiYear',
      config: {
        type: 'multiYear',
        interval: parseInt(multiYearMatch[1]),
        baseYear: new Date().getFullYear(),
        month: 1,
        dayOfMonth: 1,
      },
    }
  }

  // Nth weekday (e.g., "Second Tuesday")
  const nthWeekdayMatch = w.match(/(first|second|third|fourth|last)\s+(sunday|monday|tuesday|wednesday|thursday|friday|saturday)/i)
  if (nthWeekdayMatch) {
    const nMap: Record<string, number> = { first: 1, second: 2, third: 3, fourth: 4, last: 5 }
    const dayMap: Record<string, number> = {
      sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6,
    }
    return {
      type: 'nthWeekday',
      config: {
        type: 'nthWeekday',
        n: nMap[nthWeekdayMatch[1].toLowerCase()],
        dayOfWeek: dayMap[nthWeekdayMatch[2].toLowerCase()],
      },
    }
  }

  // Two specific dates with days (e.g., "Apr 30/Oct 31")
  const twoDateMatch = w.match(/([a-z]+)\s+(\d{1,2})\s*\/\s*([a-z]+)\s+(\d{1,2})/i)
  if (twoDateMatch) {
    const month1 = MONTH_MAP[twoDateMatch[1].toLowerCase()]
    const day1 = parseInt(twoDateMatch[2])
    const month2 = MONTH_MAP[twoDateMatch[3].toLowerCase()]
    const day2 = parseInt(twoDateMatch[4])
    if (month1 && month2) {
      return {
        type: 'multiDate',
        config: {
          type: 'multiDate',
          dates: [
            { month: month1, day: day1 },
            { month: month2, day: day2 },
          ],
        },
      }
    }
  }

  // Month range with full names (e.g., "January/July")
  const fullMonthSlashMatch = w.match(/^(january|february|march|april|may|june|july|august|september|october|november|december)\/(january|february|march|april|may|june|july|august|september|october|november|december)$/i)
  if (fullMonthSlashMatch) {
    return {
      type: 'multiMonth',
      config: {
        type: 'multiMonth',
        months: [
          MONTH_MAP[fullMonthSlashMatch[1].toLowerCase()],
          MONTH_MAP[fullMonthSlashMatch[2].toLowerCase()],
        ],
        dayOfMonth: 1,
      },
    }
  }

  // Month range (e.g., "Jan-Mar", "Jun-Dec")
  const monthRangeMatch = w.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)-(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i)
  if (monthRangeMatch) {
    const startMonth = MONTH_MAP[monthRangeMatch[1].toLowerCase()]
    const endMonth = MONTH_MAP[monthRangeMatch[2].toLowerCase()]
    const months: number[] = []
    if (startMonth <= endMonth) {
      for (let m = startMonth; m <= endMonth; m++) {
        months.push(m)
      }
    } else {
      // Handle wrap-around (e.g., Oct-Mar)
      for (let m = startMonth; m <= 12; m++) months.push(m)
      for (let m = 1; m <= endMonth; m++) months.push(m)
    }
    return { type: 'multiMonth', config: { type: 'multiMonth', months, dayOfMonth: 1 } }
  }

  // Multiple months separated by / (e.g., "Mar/Sep", "Oct/Nov")
  const multiMonthSlashMatch = w.match(/^(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)$/i)
  if (multiMonthSlashMatch) {
    return {
      type: 'multiMonth',
      config: {
        type: 'multiMonth',
        months: [
          MONTH_MAP[multiMonthSlashMatch[1].toLowerCase()],
          MONTH_MAP[multiMonthSlashMatch[2].toLowerCase()],
        ],
        dayOfMonth: 1,
      },
    }
  }

  // Specific date with day, comma, and year (e.g., "December 3, 2026")
  const fullDateWithCommaMatch = w.match(/([a-z]+)\s+(\d{1,2}),?\s+(\d{4})/i)
  if (fullDateWithCommaMatch) {
    const month = MONTH_MAP[fullDateWithCommaMatch[1].toLowerCase()]
    if (month) {
      return {
        type: 'oneTime',
        config: {
          type: 'oneTime',
          date: `${fullDateWithCommaMatch[3]}-${String(month).padStart(2, '0')}-${String(parseInt(fullDateWithCommaMatch[2])).padStart(2, '0')}`,
        },
      }
    }
  }

  // Specific date with year (e.g., "May 2025", "October 2029")
  const oneTimeYearMatch = w.match(/^([a-z]+)\s+(\d{4})$/i)
  if (oneTimeYearMatch) {
    const month = MONTH_MAP[oneTimeYearMatch[1].toLowerCase()]
    if (month) {
      const year = parseInt(oneTimeYearMatch[2])
      return {
        type: 'oneTime',
        config: { type: 'oneTime', date: `${year}-${String(month).padStart(2, '0')}-01` },
      }
    }
  }

  // Specific date (e.g., "January 11", "October 27", "December 1")
  const specificDateMatch = w.match(/^([a-z]+)\s+(\d{1,2})$/i)
  if (specificDateMatch) {
    const month = MONTH_MAP[specificDateMatch[1].toLowerCase()]
    if (month) {
      return {
        type: 'yearly',
        config: {
          type: 'yearly',
          month: month,
          dayOfMonth: parseInt(specificDateMatch[2]),
        },
      }
    }
  }

  // Month name only (e.g., "January", "May")
  const monthOnlyMatch = w.match(/^(january|february|march|april|may|june|july|august|september|october|november|december)$/i)
  if (monthOnlyMatch) {
    return {
      type: 'yearly',
      config: { type: 'yearly', month: MONTH_MAP[monthOnlyMatch[1].toLowerCase()], dayOfMonth: 1 },
    }
  }

  // Year only (e.g., "2024", "2025")
  const yearOnlyMatch = w.match(/^(\d{4})$/)
  if (yearOnlyMatch) {
    return {
      type: 'oneTime',
      config: { type: 'oneTime', date: `${yearOnlyMatch[1]}-01-01` },
    }
  }

  // As Needed / As Occurs
  if (w.includes('as needed') || w.includes('as occurs')) {
    return { type: 'asNeeded', config: { type: 'asNeeded' } }
  }

  // Default to yearly if we can't parse
  console.log('Unrecognized recurrence pattern:', when)
  return { type: 'yearly', config: { type: 'yearly', month: 1, dayOfMonth: 1 } }
}

// Generate instances for a task definition
function generateInstances(
  taskId: number,
  config: RecurrenceConfig,
  startYear: number,
  endYear: number
): Array<{ task_definition_id: number; scheduled_date: string }> {
  const instances: Array<{ task_definition_id: number; scheduled_date: string }> = []
  const startDate = new Date(startYear, 0, 1)
  const endDate = new Date(endYear, 11, 31)

  switch (config.type) {
    case 'daily': {
      const current = new Date(startDate)
      while (current <= endDate) {
        const dayOfWeek = current.getDay()
        const isWeekday = dayOfWeek !== 0 && dayOfWeek !== 6
        if (!config.weekdaysOnly || isWeekday) {
          instances.push({
            task_definition_id: taskId,
            scheduled_date: current.toISOString().split('T')[0],
          })
        }
        current.setDate(current.getDate() + 1)
      }
      break
    }

    case 'weekly': {
      const current = new Date(startDate)
      const targetDay = (config.dayOfWeek as number) || 1
      // Move to first occurrence of target day
      while (current.getDay() !== targetDay) {
        current.setDate(current.getDate() + 1)
      }
      while (current <= endDate) {
        instances.push({
          task_definition_id: taskId,
          scheduled_date: current.toISOString().split('T')[0],
        })
        current.setDate(current.getDate() + 7)
      }
      break
    }

    case 'monthly': {
      for (let year = startYear; year <= endYear; year++) {
        for (let month = 0; month < 12; month++) {
          const day = Math.min(config.dayOfMonth as number, new Date(year, month + 1, 0).getDate())
          instances.push({
            task_definition_id: taskId,
            scheduled_date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          })
        }
      }
      break
    }

    case 'bimonthly': {
      for (let year = startYear; year <= endYear; year++) {
        for (let month = 0; month < 12; month++) {
          const isEven = (month + 1) % 2 === 0
          const matchesParity = config.monthParity === 'even' ? isEven : !isEven
          if (matchesParity) {
            const day = Math.min(config.dayOfMonth as number || 1, new Date(year, month + 1, 0).getDate())
            instances.push({
              task_definition_id: taskId,
              scheduled_date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            })
          }
        }
      }
      break
    }

    case 'quarterly': {
      const quarterMonths = [0, 3, 6, 9] // Jan, Apr, Jul, Oct
      for (let year = startYear; year <= endYear; year++) {
        for (const month of quarterMonths) {
          const targetMonth = month + ((config.monthOfQuarter as number || 1) - 1)
          const day = Math.min(config.dayOfMonth as number || 1, new Date(year, targetMonth + 1, 0).getDate())
          instances.push({
            task_definition_id: taskId,
            scheduled_date: `${year}-${String(targetMonth + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          })
        }
      }
      break
    }

    case 'yearly': {
      for (let year = startYear; year <= endYear; year++) {
        const month = (config.month as number) - 1
        const day = Math.min(config.dayOfMonth as number || 1, new Date(year, month + 1, 0).getDate())
        instances.push({
          task_definition_id: taskId,
          scheduled_date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
        })
      }
      break
    }

    case 'nthWeekday': {
      for (let year = startYear; year <= endYear; year++) {
        for (let month = 0; month < 12; month++) {
          const firstDay = new Date(year, month, 1)
          const dayOfWeek = config.dayOfWeek as number
          const n = config.n as number

          // Find first occurrence of the day in the month
          let day = 1
          while (new Date(year, month, day).getDay() !== dayOfWeek) {
            day++
          }

          // Move to nth occurrence
          day += (n - 1) * 7

          // Check if still in month
          if (day <= new Date(year, month + 1, 0).getDate()) {
            instances.push({
              task_definition_id: taskId,
              scheduled_date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
            })
          }
        }
      }
      break
    }

    case 'multiMonth': {
      const months = config.months as number[]
      for (let year = startYear; year <= endYear; year++) {
        for (const month of months) {
          const day = Math.min(config.dayOfMonth as number || 1, new Date(year, month, 0).getDate())
          instances.push({
            task_definition_id: taskId,
            scheduled_date: `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          })
        }
      }
      break
    }

    case 'multiDate': {
      // Multiple specific dates per year (e.g., "Apr 30/Oct 31")
      const dates = config.dates as Array<{ month: number; day: number }>
      for (let year = startYear; year <= endYear; year++) {
        for (const { month, day } of dates) {
          const actualDay = Math.min(day, new Date(year, month, 0).getDate())
          instances.push({
            task_definition_id: taskId,
            scheduled_date: `${year}-${String(month).padStart(2, '0')}-${String(actualDay).padStart(2, '0')}`,
          })
        }
      }
      break
    }

    case 'multiYear': {
      const baseYear = config.baseYear as number
      const interval = config.interval as number
      for (let year = startYear; year <= endYear; year++) {
        if ((year - baseYear) % interval === 0) {
          const month = (config.month as number) - 1
          const day = Math.min(config.dayOfMonth as number || 1, new Date(year, month + 1, 0).getDate())
          instances.push({
            task_definition_id: taskId,
            scheduled_date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          })
        }
      }
      break
    }

    case 'oneTime': {
      const date = config.date as string
      if (date >= `${startYear}-01-01` && date <= `${endYear}-12-31`) {
        instances.push({
          task_definition_id: taskId,
          scheduled_date: date,
        })
      }
      break
    }

    // asNeeded and asOccurs don't generate automatic instances
  }

  return instances
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const { tasks, yearStart, yearEnd } = await request.json() as {
      tasks: ParsedTask[]
      yearStart: number
      yearEnd: number
    }

    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No tasks provided' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get existing categories
    const { results: existingCategories } = await env.DB.prepare(
      'SELECT id, name FROM categories'
    ).all<{ id: number; name: string }>()

    const categoryMap = new Map(existingCategories.map((c) => [c.name.toLowerCase(), c.id]))

    let tasksCreated = 0
    let instancesCreated = 0

    // First, create any missing categories
    const uniqueCategories = [...new Set(tasks.map((t) => t.category.toLowerCase()))]
    for (const cat of uniqueCategories) {
      if (!categoryMap.has(cat)) {
        const originalCat = tasks.find((t) => t.category.toLowerCase() === cat)?.category || cat
        const result = await env.DB.prepare(
          'INSERT INTO categories (name) VALUES (?) RETURNING id'
        )
          .bind(originalCat)
          .first<{ id: number }>()
        categoryMap.set(cat, result!.id)
      }
    }

    // Process tasks in smaller batches to avoid rate limits
    const BATCH_SIZE = 10
    for (let i = 0; i < tasks.length; i += BATCH_SIZE) {
      const taskBatch = tasks.slice(i, i + BATCH_SIZE)
      const allInstances: Array<{ task_definition_id: number; scheduled_date: string }> = []

      // Create task definitions for this batch
      for (const task of taskBatch) {
        const categoryId = categoryMap.get(task.category.toLowerCase())!
        const { type, config } = parseRecurrence(task.when)

        const taskResult = await env.DB.prepare(`
          INSERT INTO task_definitions (category_id, title, recurrence_type, recurrence_config)
          VALUES (?, ?, ?, ?)
          RETURNING id
        `)
          .bind(categoryId, task.title, type, JSON.stringify(config))
          .first<{ id: number }>()

        tasksCreated++

        // Generate instances
        const instances = generateInstances(taskResult!.id, config, yearStart, yearEnd)
        allInstances.push(...instances)
      }

      // Batch insert instances using D1 batch API (chunks of 100)
      const INSTANCE_BATCH_SIZE = 100
      for (let j = 0; j < allInstances.length; j += INSTANCE_BATCH_SIZE) {
        const instanceBatch = allInstances.slice(j, j + INSTANCE_BATCH_SIZE)
        const statements = instanceBatch.map((instance) =>
          env.DB.prepare(
            'INSERT OR IGNORE INTO task_instances (task_definition_id, scheduled_date) VALUES (?, ?)'
          ).bind(instance.task_definition_id, instance.scheduled_date)
        )
        await env.DB.batch(statements)
        instancesCreated += instanceBatch.length
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          tasksCreated,
          instancesCreated,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error importing tasks:', error)
    const errorMessage = error instanceof Error ? error.message : String(error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to import tasks', details: errorMessage }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
