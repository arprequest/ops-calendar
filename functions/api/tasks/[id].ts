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
  const { env, params } = context
  const id = params.id

  try {
    const task = await env.DB.prepare(`
      SELECT td.*, c.name as category_name, c.color as category_color
      FROM task_definitions td
      LEFT JOIN categories c ON td.category_id = c.id
      WHERE td.id = ?
    `)
      .bind(id)
      .first<TaskDefinition & { category_name: string; category_color: string }>()

    if (!task) {
      return new Response(
        JSON.stringify({ success: false, error: 'Task not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...task,
          recurrence_config: JSON.parse(task.recurrence_config),
          is_active: Boolean(task.is_active),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error fetching task:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch task' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env, params } = context
  const id = params.id

  try {
    const body = await request.json() as Partial<{
      category_id: number
      title: string
      description: string
      recurrence_type: string
      recurrence_config: object
      is_active: boolean
    }>

    // Build update query dynamically
    const updates: string[] = []
    const values: (string | number | null)[] = []

    if (body.category_id !== undefined) {
      updates.push('category_id = ?')
      values.push(body.category_id)
    }
    if (body.title !== undefined) {
      updates.push('title = ?')
      values.push(body.title)
    }
    if (body.description !== undefined) {
      updates.push('description = ?')
      values.push(body.description)
    }
    if (body.recurrence_type !== undefined) {
      updates.push('recurrence_type = ?')
      values.push(body.recurrence_type)
    }
    if (body.recurrence_config !== undefined) {
      updates.push('recurrence_config = ?')
      values.push(JSON.stringify(body.recurrence_config))
    }
    if (body.is_active !== undefined) {
      updates.push('is_active = ?')
      values.push(body.is_active ? 1 : 0)
    }

    updates.push('updated_at = datetime("now")')
    values.push(id as string)

    const result = await env.DB.prepare(`
      UPDATE task_definitions
      SET ${updates.join(', ')}
      WHERE id = ?
      RETURNING *
    `)
      .bind(...values)
      .first<TaskDefinition>()

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: 'Task not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          ...result,
          recurrence_config: JSON.parse(result.recurrence_config),
          is_active: Boolean(result.is_active),
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error updating task:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update task' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params } = context
  const id = params.id

  try {
    await env.DB.prepare('DELETE FROM task_definitions WHERE id = ?').bind(id).run()

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error deleting task:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to delete task' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
