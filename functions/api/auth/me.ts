interface Env {
  DB: D1Database
}

interface User {
  id: number
  username: string
  role: 'admin' | 'user'
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  // User is set by middleware
  const user = context.data?.user as User | undefined

  if (!user) {
    return new Response(JSON.stringify({ success: false, error: 'Not authenticated' }), {
      status: 401,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  return new Response(
    JSON.stringify({
      success: true,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
      },
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  )
}
