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

  // Month range (e.g., "Jan-Mar", "May-Jul")
  const monthRangeMatch = w.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)[-\/](jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)
  if (monthRangeMatch) {
    const monthMap: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    }
    const startMonth = monthMap[monthRangeMatch[1].toLowerCase()]
    const endMonth = monthMap[monthRangeMatch[2].toLowerCase()]
    const months: number[] = []
    for (let m = startMonth; m <= endMonth; m++) {
      months.push(m)
    }
    return { type: 'multiMonth', config: { type: 'multiMonth', months, dayOfMonth: 1 } }
  }

  // Multiple months separated by / (e.g., "Mar/Sep", "Oct/Nov")
  const multiMonthSlashMatch = w.match(/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)\/(jan|feb|mar|apr|may|jun|jul|aug|sep|oct|nov|dec)/i)
  if (multiMonthSlashMatch) {
    const monthMap: Record<string, number> = {
      jan: 1, feb: 2, mar: 3, apr: 4, may: 5, jun: 6,
      jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    }
    return {
      type: 'multiMonth',
      config: {
        type: 'multiMonth',
        months: [
          monthMap[multiMonthSlashMatch[1].toLowerCase()],
          monthMap[multiMonthSlashMatch[2].toLowerCase()],
        ],
        dayOfMonth: 1,
      },
    }
  }

  // Specific date with year (e.g., "May 2025", "October 2029")
  const oneTimeYearMatch = w.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{4})/i)
  if (oneTimeYearMatch) {
    const monthMap: Record<string, number> = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
      jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    }
    const month = monthMap[oneTimeYearMatch[1].toLowerCase()]
    const year = parseInt(oneTimeYearMatch[2])
    return {
      type: 'oneTime',
      config: { type: 'oneTime', date: `${year}-${String(month).padStart(2, '0')}-01` },
    }
  }

  // Specific date (e.g., "January 11", "October 27", "December 1")
  const specificDateMatch = w.match(/(january|february|march|april|may|june|july|august|september|october|november|december|jan|feb|mar|apr|jun|jul|aug|sep|oct|nov|dec)\s+(\d{1,2})/i)
  if (specificDateMatch) {
    const monthMap: Record<string, number> = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
      jan: 1, feb: 2, mar: 3, apr: 4, jun: 6, jul: 7, aug: 8, sep: 9, oct: 10, nov: 11, dec: 12,
    }
    return {
      type: 'yearly',
      config: {
        type: 'yearly',
        month: monthMap[specificDateMatch[1].toLowerCase()],
        dayOfMonth: parseInt(specificDateMatch[2]),
      },
    }
  }

  // Month name only (e.g., "January", "May")
  const monthOnlyMatch = w.match(/^(january|february|march|april|may|june|july|august|september|october|november|december)$/i)
  if (monthOnlyMatch) {
    const monthMap: Record<string, number> = {
      january: 1, february: 2, march: 3, april: 4, may: 5, june: 6,
      july: 7, august: 8, september: 9, october: 10, november: 11, december: 12,
    }
    return {
      type: 'yearly',
      config: { type: 'yearly', month: monthMap[monthOnlyMatch[1].toLowerCase()], dayOfMonth: 1 },
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

    for (const task of tasks) {
      // Get or create category
      let categoryId = categoryMap.get(task.category.toLowerCase())
      if (!categoryId) {
        const result = await env.DB.prepare(
          'INSERT INTO categories (name) VALUES (?) RETURNING id'
        )
          .bind(task.category)
          .first<{ id: number }>()
        categoryId = result!.id
        categoryMap.set(task.category.toLowerCase(), categoryId)
      }

      // Parse recurrence
      const { type, config } = parseRecurrence(task.when)

      // Create task definition
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

      // Batch insert instances
      for (const instance of instances) {
        await env.DB.prepare(`
          INSERT OR IGNORE INTO task_instances (task_definition_id, scheduled_date)
          VALUES (?, ?)
        `)
          .bind(instance.task_definition_id, instance.scheduled_date)
          .run()
        instancesCreated++
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
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to import tasks' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
