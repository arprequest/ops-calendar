interface Env {
  DB: D1Database
}

interface TaskInstance {
  id: number
  task_definition_id: number
  scheduled_date: string
  status: string
  completed_at: string | null
  completed_by: number | null
  notes: string | null
  created_at: string
}

interface TaskDefinition {
  id: number
  category_id: number
  title: string
  recurrence_type: string
  recurrence_config: string
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context
  const url = new URL(context.request.url)
  const start = url.searchParams.get('start')
  const end = url.searchParams.get('end')
  const status = url.searchParams.get('status')

  if (!start || !end) {
    return new Response(
      JSON.stringify({ success: false, error: 'Start and end dates are required' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    let query = `
      SELECT
        ti.*,
        td.title as task_title,
        td.category_id,
        td.recurrence_type,
        td.recurrence_config,
        c.name as category_name,
        c.color as category_color
      FROM task_instances ti
      JOIN task_definitions td ON ti.task_definition_id = td.id
      LEFT JOIN categories c ON td.category_id = c.id
      WHERE ti.scheduled_date >= ? AND ti.scheduled_date <= ?
    `
    const params: string[] = [start, end]

    if (status) {
      query += ' AND ti.status = ?'
      params.push(status)
    }

    query += ' ORDER BY ti.scheduled_date, c.sort_order, td.title'

    const { results } = await env.DB.prepare(query)
      .bind(...params)
      .all<TaskInstance & {
        task_title: string
        category_id: number
        recurrence_type: string
        recurrence_config: string
        category_name: string
        category_color: string
      }>()

    // Transform results to include nested task_definition object
    const instances = results.map((row) => ({
      id: row.id,
      task_definition_id: row.task_definition_id,
      scheduled_date: row.scheduled_date,
      status: row.status,
      completed_at: row.completed_at,
      completed_by: row.completed_by,
      notes: row.notes,
      created_at: row.created_at,
      task_definition: {
        id: row.task_definition_id,
        title: row.task_title,
        category_id: row.category_id,
        recurrence_type: row.recurrence_type,
        recurrence_config: JSON.parse(row.recurrence_config),
      },
      category: row.category_name
        ? {
            id: row.category_id,
            name: row.category_name,
            color: row.category_color,
          }
        : null,
    }))

    return new Response(JSON.stringify({ success: true, data: instances }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching instances:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch instances' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
