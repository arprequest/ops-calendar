interface Env {
  DB: D1Database
}

interface User {
  id: number
  username: string
  role: 'admin' | 'user'
  created_at: string
}

// Hash password using SHA-256 (for development; use Argon2 in production)
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { env, data } = context
  const currentUser = data?.user as User | undefined

  // Only admins can list users
  if (currentUser?.role !== 'admin') {
    return new Response(
      JSON.stringify({ success: false, error: 'Admin access required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { results } = await env.DB.prepare(
      'SELECT id, username, role, created_at FROM users ORDER BY created_at DESC'
    ).all<User>()

    return new Response(JSON.stringify({ success: true, data: results }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error fetching users:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to fetch users' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, data } = context
  const currentUser = data?.user as User | undefined

  // Only admins can create users
  if (currentUser?.role !== 'admin') {
    return new Response(
      JSON.stringify({ success: false, error: 'Admin access required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { username, password, role } = await request.json() as {
      username: string
      password: string
      role?: 'admin' | 'user'
    }

    if (!username || !password) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username and password required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Check if username exists
    const existing = await env.DB.prepare('SELECT id FROM users WHERE username = ?')
      .bind(username)
      .first()

    if (existing) {
      return new Response(
        JSON.stringify({ success: false, error: 'Username already exists' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    const passwordHash = await hashPassword(password)

    const result = await env.DB.prepare(`
      INSERT INTO users (username, password_hash, role)
      VALUES (?, ?, ?)
      RETURNING id, username, role, created_at
    `)
      .bind(username, passwordHash, role || 'user')
      .first<User>()

    return new Response(JSON.stringify({ success: true, data: result }), {
      status: 201,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error creating user:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to create user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
