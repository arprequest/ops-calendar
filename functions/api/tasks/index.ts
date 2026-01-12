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

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...result,
          recurrence_config: JSON.parse(result!.recurrence_config),
          is_active: Boolean(result!.is_active),
        },
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
