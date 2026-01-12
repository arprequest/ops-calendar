import { useState } from 'react'
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { clsx } from 'clsx'
import { useAuthStore } from '../stores/authStore'
import type { User } from '../types'

export default function SettingsPage() {
  const { user } = useAuthStore()
  const isAdmin = user?.role === 'admin'

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900">Settings</h1>

      {/* Profile section */}
      <div className="card p-6">
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Your Profile</h2>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
            <p className="text-gray-900">{user?.username}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
            <p className="text-gray-900 capitalize">{user?.role}</p>
          </div>
        </div>
      </div>

      {/* Change Password section */}
      <ChangePassword />

      {/* Admin section */}
      {isAdmin && <UserManagement />}
    </div>
  )
}

function ChangePassword() {
  const [currentPassword, setCurrentPassword] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  const changePasswordMutation = useMutation({
    mutationFn: async (data: { currentPassword: string; newPassword: string }) => {
      const response = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || 'Failed to change password')
      return result
    },
    onSuccess: () => {
      setMessage({ type: 'success', text: 'Password changed successfully!' })
      setCurrentPassword('')
      setNewPassword('')
      setConfirmPassword('')
      setTimeout(() => setMessage(null), 5000)
    },
    onError: (error: Error) => {
      setMessage({ type: 'error', text: error.message })
      setTimeout(() => setMessage(null), 5000)
    },
  })

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    setMessage(null)

    if (newPassword !== confirmPassword) {
      setMessage({ type: 'error', text: 'New passwords do not match' })
      return
    }

    if (newPassword.length < 4) {
      setMessage({ type: 'error', text: 'New password must be at least 4 characters' })
      return
    }

    changePasswordMutation.mutate({ currentPassword, newPassword })
  }

  return (
    <div className="card p-6">
      <h2 className="text-lg font-semibold text-gray-900 mb-4">Change Password</h2>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Current Password
          </label>
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            className="input"
            placeholder="Enter current password"
            required
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            New Password
          </label>
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="input"
            placeholder="Enter new password"
            required
            minLength={4}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Confirm New Password
          </label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            className="input"
            placeholder="Confirm new password"
            required
          />
        </div>

        {message && (
          <div
            className={clsx(
              'p-3 rounded-lg text-sm',
              message.type === 'success'
                ? 'bg-green-50 text-green-700 border border-green-200'
                : 'bg-red-50 text-red-700 border border-red-200'
            )}
          >
            {message.text}
          </div>
        )}

        <button
          type="submit"
          disabled={changePasswordMutation.isPending || !currentPassword || !newPassword || !confirmPassword}
          className="btn btn-primary"
        >
          {changePasswordMutation.isPending ? 'Changing...' : 'Change Password'}
        </button>
      </form>
    </div>
  )
}

function UserManagement() {
  const [isAddingUser, setIsAddingUser] = useState(false)
  const [newUsername, setNewUsername] = useState('')
  const [newPassword, setNewPassword] = useState('')
  const [newRole, setNewRole] = useState<'admin' | 'user'>('user')

  const queryClient = useQueryClient()

  const { data: users = [], isLoading } = useQuery<User[]>({
    queryKey: ['users'],
    queryFn: async () => {
      const response = await fetch('/api/users')
      if (!response.ok) throw new Error('Failed to fetch users')
      const data = await response.json()
      return data.data || []
    },
  })

  const createUserMutation = useMutation({
    mutationFn: async (data: { username: string; password: string; role: 'admin' | 'user' }) => {
      const response = await fetch('/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!response.ok) throw new Error('Failed to create user')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
      setIsAddingUser(false)
      setNewUsername('')
      setNewPassword('')
      setNewRole('user')
    },
  })

  const deleteUserMutation = useMutation({
    mutationFn: async (userId: number) => {
      const response = await fetch(`/api/users/${userId}`, { method: 'DELETE' })
      if (!response.ok) throw new Error('Failed to delete user')
      return response.json()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] })
    },
  })

  return (
    <div className="card p-6">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-gray-900">User Management</h2>
        <button
          onClick={() => setIsAddingUser(true)}
          className="btn btn-primary text-sm"
        >
          + Add User
        </button>
      </div>

      {/* Add user form */}
      {isAddingUser && (
        <div className="mb-6 p-4 bg-gray-50 rounded-lg">
          <h3 className="font-medium text-gray-900 mb-3">Add New User</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
              <input
                type="text"
                value={newUsername}
                onChange={(e) => setNewUsername(e.target.value)}
                className="input"
                placeholder="username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
              <input
                type="password"
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                className="input"
                placeholder="password"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={newRole}
                onChange={(e) => setNewRole(e.target.value as 'admin' | 'user')}
                className="input"
              >
                <option value="user">User</option>
                <option value="admin">Admin</option>
              </select>
            </div>
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <button
              onClick={() => setIsAddingUser(false)}
              className="btn btn-secondary text-sm"
            >
              Cancel
            </button>
            <button
              onClick={() => createUserMutation.mutate({
                username: newUsername,
                password: newPassword,
                role: newRole,
              })}
              disabled={!newUsername || !newPassword || createUserMutation.isPending}
              className="btn btn-primary text-sm"
            >
              {createUserMutation.isPending ? 'Creating...' : 'Create User'}
            </button>
          </div>
        </div>
      )}

      {/* Users list */}
      {isLoading ? (
        <div className="py-4 text-center text-gray-500">Loading users...</div>
      ) : (
        <table className="w-full">
          <thead className="border-b border-gray-200">
            <tr>
              <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase">Username</th>
              <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase">Role</th>
              <th className="text-left py-3 text-xs font-semibold text-gray-500 uppercase">Created</th>
              <th className="text-right py-3 text-xs font-semibold text-gray-500 uppercase">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {users.map((u) => (
              <tr key={u.id}>
                <td className="py-3 font-medium text-gray-900">{u.username}</td>
                <td className="py-3">
                  <span
                    className={clsx(
                      'inline-flex px-2 py-1 text-xs font-medium rounded-full',
                      u.role === 'admin'
                        ? 'bg-purple-100 text-purple-700'
                        : 'bg-gray-100 text-gray-600'
                    )}
                  >
                    {u.role}
                  </span>
                </td>
                <td className="py-3 text-gray-600">
                  {new Date(u.created_at).toLocaleDateString()}
                </td>
                <td className="py-3 text-right">
                  <button
                    onClick={() => {
                      if (confirm(`Delete user ${u.username}?`)) {
                        deleteUserMutation.mutate(u.id)
                      }
                    }}
                    className="text-red-600 hover:text-red-700 text-sm font-medium"
                  >
                    Delete
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
