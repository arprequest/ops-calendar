import { create } from 'zustand'
import { persist } from 'zustand/middleware'
import type { User } from '../types'

interface AuthState {
  user: User | null
  isAuthenticated: boolean
  isLoading: boolean
  login: (username: string, password: string) => Promise<boolean>
  logout: () => Promise<void>
  checkAuth: () => Promise<void>
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      isLoading: true,

      login: async (username: string, password: string) => {
        try {
          const response = await fetch('/api/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ username, password }),
          })

          if (!response.ok) {
            return false
          }

          const data = await response.json()
          if (data.success && data.user) {
            set({ user: data.user, isAuthenticated: true })
            return true
          }
          return false
        } catch {
          return false
        }
      },

      logout: async () => {
        try {
          await fetch('/api/auth/logout', { method: 'POST' })
        } finally {
          set({ user: null, isAuthenticated: false })
        }
      },

      checkAuth: async () => {
        set({ isLoading: true })
        try {
          const response = await fetch('/api/auth/me')
          if (response.ok) {
            const data = await response.json()
            if (data.success && data.user) {
              set({ user: data.user, isAuthenticated: true, isLoading: false })
              return
            }
          }
          set({ user: null, isAuthenticated: false, isLoading: false })
        } catch {
          set({ user: null, isAuthenticated: false, isLoading: false })
        }
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({ user: state.user, isAuthenticated: state.isAuthenticated }),
    }
  )
)
