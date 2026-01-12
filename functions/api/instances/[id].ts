interface Env {
  DB: D1Database
}

interface User {
  id: number
  username: string
  role: 'admin' | 'user'
}

export const onRequestPut: PagesFunction<Env> = async (context) => {
  const { request, env, params, data } = context
  const id = params.id
  const user = data?.user as User | undefined

  try {
    const body = await request.json() as {
      status?: 'pending' | 'completed' | 'skipped'
      notes?: string
    }

    const updates: string[] = []
    const values: (string | number | null)[] = []

    if (body.status !== undefined) {
      updates.push('status = ?')
      values.push(body.status)

      if (body.status === 'completed') {
        updates.push('completed_at = datetime("now")')
        updates.push('completed_by = ?')
        values.push(user?.id || null)
      } else if (body.status === 'pending') {
        updates.push('completed_at = NULL')
        updates.push('completed_by = NULL')
      }
    }

    if (body.notes !== undefined) {
      updates.push('notes = ?')
      values.push(body.notes)
    }

    if (updates.length === 0) {
      return new Response(
        JSON.stringify({ success: false, error: 'No fields to update' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    values.push(id as string)

    const result = await env.DB.prepare(`
      UPDATE task_instances
      SET ${updates.join(', ')}
      WHERE id = ?
      RETURNING *
    `)
      .bind(...values)
      .first()

    if (!result) {
      return new Response(
        JSON.stringify({ success: false, error: 'Instance not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error updating instance:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to update instance' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
