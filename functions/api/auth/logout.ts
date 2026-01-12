interface Env {
  DB: D1Database
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env } = context

  // Get session from cookie
  const cookies = request.headers.get('Cookie') || ''
  const sessionId = cookies
    .split(';')
    .find((c) => c.trim().startsWith('session='))
    ?.split('=')[1]

  if (sessionId) {
    // Delete session from database
    await env.DB.prepare('DELETE FROM sessions WHERE id = ?').bind(sessionId).run()
  }

  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: {
      'Content-Type': 'application/json',
      'Set-Cookie': 'session=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0',
    },
  })
}
