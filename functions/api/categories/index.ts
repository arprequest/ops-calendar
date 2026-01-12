interface Env {
  DB: D1Database
}

interface Category {
  id: number
  name: string
  color: string
  sort_order: number
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env } = context

  try {
    const { results } = await env.DB.prepare(
      'SELECT * FROM categories ORDER BY sort_order, name'
    ).all<Category>()

    return new Response(JSON.stringify({ success: true, data: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching categories:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch categories' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  try {
    const { name, color, sort_order } = await request.json() as {
      name: string
      color?: string
      sort_order?: number
    }

    if (!name) {
      return new Response(
        JSON.stringify({ success: false, error: 'Name is required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const result = await env.DB.prepare(
      'INSERT INTO categories (name, color, sort_order) VALUES (?, ?, ?) RETURNING *'
    )
      .bind(name, color || '#3B82F6', sort_order || 0)
      .first<Category>()

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating category:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create category' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
