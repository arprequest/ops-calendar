interface Env {
  DB: D1Database
}

interface TaskDefinition {
  id: number
  category_id: number
  title: string
  description: string | null
  recurrence_type: string
  recurrence_config: string
  is_active: number
  created_at: string
  updated_at: string
}

interface RecurrenceConfig {
  type: string
  [key: string]: unknown
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
      while (current.getDay() !== targetDay) current.setDate(current.getDate() + 1)
      while (current <= endDate) {
        instances.push({ task_definition_id: taskId, scheduled_date: current.toISOString().split('T')[0] })
        current.setDate(current.getDate() + 7)
      }
      break
    }
    case 'monthly': {
      for (let year = startYear; year <= endYear; year++) {
        for (let month = 0; month < 12; month++) {
          const day = Math.min(config.dayOfMonth as number || 1, new Date(year, month + 1, 0).getDate())
          instances.push({
            task_definition_id: taskId,
            scheduled_date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
          })
        }
      }
      break
    }
    case 'quarterly': {
      const quarterMonths = [0, 3, 6, 9]
      for (let year = startYear; year <= endYear; year++) {
        for (const month of quarterMonths) {
          const day = Math.min(config.dayOfMonth as number || 1, new Date(year, month + 1, 0).getDate())
          instances.push({
            task_definition_id: taskId,
            scheduled_date: `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
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
    case 'bimonthly': {
      for (let year = startYear; year <= endYear; year++) {
        for (let month = 0; month < 12; month++) {
          const isEven = (month + 1) % 2 === 0
          if ((config.monthParity === 'even') === isEven) {
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
    // asNeeded doesn't generate automatic instances
  }
  return instances
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context
  const url = new URL(context.request.url)
  const categoryId = url.searchParams.get('category_id')

  try {
    let query = `
      SELECT td.*, c.name as category_name, c.color as category_color
      FROM task_definitions td
      LEFT JOIN categories c ON td.category_id = c.id
    `
    const params: (string | number)[] = []

    if (categoryId) {
      query += ' WHERE td.category_id = ?'
      params.push(parseInt(categoryId))
    }

    query += ' ORDER BY c.sort_order, td.title'

    const stmt = params.length > 0
      ? env.DB.prepare(query).bind(...params)
      : env.DB.prepare(query)

    const { results } = await stmt.all<TaskDefinition & { category_name: string; category_color: string }>()

    // Parse recurrence_config JSON
    const tasks = results.map((task) => ({
      ...task,
      recurrence_config: JSON.parse(task.recurrence_config),
      is_active: Boolean(task.is_active),
    }))

    return new Response(JSON.stringify({ success: true, data: tasks }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching tasks:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch tasks' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const body = await request.json() as {
      category_id: number
      title: string
      description?: string
      recurrence_type: string
      recurrence_config: object
    }

    const { category_id, title, description, recurrence_type, recurrence_config } = body

    if (!title || !recurrence_type || !recurrence_config) {
      return new Response(
        JSON.stringify({ success: false, error: 'Missing required fields' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const result = await env.DB.prepare(`
      INSERT INTO task_definitions (category_id, title, description, recurrence_type, recurrence_config)
      VALUES (?, ?, ?, ?, ?)
      RETURNING *
    `)
      .bind(category_id, title, description || null, recurrence_type, JSON.stringify(recurrence_config))
      .first<TaskDefinition>()

    // Generate instances for current and next year
    const currentYear = new Date().getFullYear()
    const instances = generateInstances(result!.id, recurrence_config as RecurrenceConfig, currentYear, currentYear + 1)

    // Batch insert instances
    if (instances.length > 0) {
      const BATCH_SIZE = 100
      for (let i = 0; i < instances.length; i += BATCH_SIZE) {
        const batch = instances.slice(i, i + BATCH_SIZE)
        const statements = batch.map((instance) =>
          env.DB.prepare(
            'INSERT OR IGNORE INTO task_instances (task_definition_id, scheduled_date) VALUES (?, ?)'
          ).bind(instance.task_definition_id, instance.scheduled_date)
        )
        await env.DB.batch(statements)
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...result,
          recurrence_config: JSON.parse(result!.recurrence_config),
          is_active: Boolean(result!.is_active),
        },
        instancesCreated: instances.length,
      }),
      { status: 201, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error creating task:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create task' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
