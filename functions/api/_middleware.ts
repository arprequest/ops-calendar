// Cloudflare Pages Functions middleware for authentication

interface Env {
  DB: D1Database
}

interface Session {
  id: string
  user_id: number
  expires_at: string
}

interface User {
  id: number
  username: string
  role: 'admin' | 'user'
}

// Paths that don't require authentication
const publicPaths = ['/api/auth/login']

export const onRequest: PagesFunction<Env> = async (context) => {
  const { request, env, next } = context
  const url = new URL(request.url)

  // Allow public paths
  if (publicPaths.some((p) => url.pathname === p)) {
    return next()
  }

  // Check for session cookie
  const cookies = request.headers.get('Cookie') || ''
  const sessionId = cookies
    .split(';')
    .find((c) => c.trim().startsWith('session='))
    ?.split('=')[1]

  if (!sessionId) {
    return new Response(JSON.stringify({ success: false, error: 'Unauthorized' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Validate session
  const session = await env.DB.prepare(
    'SELECT * FROM sessions WHERE id = ? AND expires_at > datetime("now")'
  )
    .bind(sessionId)
    .first<Session>()

  if (!session) {
    return new Response(JSON.stringify({ success: false, error: 'Session expired' }), {
      status: 401,
      headers: {
        'Content-Type': 'application/json',
        'Set-Cookie': 'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
      },
    })
  }

  // Get user
  const user = await env.DB.prepare('SELECT id, username, role FROM users WHERE id = ?')
    .bind(session.user_id)
    .first<User>()

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: 'User not found' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // Add user to context data
  context.data = { user, session }

  return next()
}
