interface Env {
  DB: D1Database
}

interface User {
  id: number
  username: string
  password_hash: string
  role: 'admin' | 'user'
}

// Hash password using SHA-256
async function hashPassword(password: string): Promise<string> {
  const encoder = new TextEncoder()
  const data = encoder.encode(password)
  const hashBuffer = await crypto.subtle.digest('SHA-256', data)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('')
}

// Verify password against stored hash
async function verifyPassword(password: string, storedHash: string): Promise<boolean> {
  const passwordHash = await hashPassword(password)
  return passwordHash === storedHash
}

export const onRequestPost: PagesFunction<Env> = async (context) => {
  const { request, env, data } = context
  const currentUser = data?.user as User | undefined

  if (!currentUser) {
    return new Response(
      JSON.stringify({ success: false, error: 'Authentication required' }),
      { status: 401, headers: { 'Content-Type': 'application/json' } }
    )
  }

  try {
    const { currentPassword, newPassword } = await request.json() as {
      currentPassword: string
      newPassword: string
    }

    if (!currentPassword || !newPassword) {
      return new Response(
        JSON.stringify({ success: false, error: 'Current and new password required' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (newPassword.length < 4) {
      return new Response(
        JSON.stringify({ success: false, error: 'New password must be at least 4 characters' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Get the user's current password hash
    const user = await env.DB.prepare('SELECT password_hash FROM users WHERE id = ?')
      .bind(currentUser.id)
      .first<{ password_hash: string }>()

    if (!user) {
      return new Response(
        JSON.stringify({ success: false, error: 'User not found' }),
        { status: 404, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Verify current password
    const isValid = await verifyPassword(currentPassword, user.password_hash)
    if (!isValid) {
      return new Response(
        JSON.stringify({ success: false, error: 'Current password is incorrect' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Hash new password and update
    const newPasswordHash = await hashPassword(newPassword)
    await env.DB.prepare('UPDATE users SET password_hash = ? WHERE id = ?')
      .bind(newPasswordHash, currentUser.id)
      .run()

    return new Response(
      JSON.stringify({ success: true, message: 'Password updated successfully' }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Change password error:', error)
    return new Response(
      JSON.stringify({ success: false, error: 'Internal server error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
}
