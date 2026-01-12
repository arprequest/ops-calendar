interface Env {
  DB: D1Database
}

interface User {
  id: number
  username: string
  role: 'admin' | 'user'
}

export const onRequestDelete: PagesFunction<Env> = async (context) => {
  const { env, params, data } = context
  const id = params.id
  const currentUser = data?.user as User | undefined

  // Only admins can delete users
  if (currentUser?.role !== 'admin') {
    return new Response(
      JSON.stringify({ success: false, error: 'Admin access required' }),
      { status: 403, headers: { 'Content-Type': 'application/json' } }
    )
  }

  // Prevent deleting yourself
  if (currentUser?.id === parseInt(id as string)) {
    return new Response(
      JSON.stringify({ success: false, error: 'Cannot delete your own account' }),
      { status: 400, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    // Delete user's sessions first
    await env.DB.prepare('DELETE FROM sessions WHERE user_id = ?').bind(id).run()

    // Delete user
    await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(id).run()

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  } catch (error) {
    console.error('Error deleting user:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Failed to delete user' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
