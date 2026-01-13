import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../test/test-utils'
import { mockUser, mockFetchResponse, mockFetchError } from '../test/mocks'
import SettingsPage from './Settings'
import { useAuthStore } from '../stores/authStore'

// Mock the auth store
vi.mock('../stores/authStore', () => ({
  useAuthStore: vi.fn(),
}))

describe('SettingsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(useAuthStore).mockReturnValue({
      user: mockUser,
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    })
    // Mock users API for admin user management
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (url === '/api/users') {
        return mockFetchResponse([mockUser])
      }
      return mockFetchResponse({})
    })
  })

  it('renders user profile information', () => {
    render(<SettingsPage />)

    expect(screen.getByText('Your Profile')).toBeInTheDocument()
    expect(screen.getByText('testuser')).toBeInTheDocument()
    expect(screen.getByText('admin')).toBeInTheDocument()
  })

  it('renders change password section', () => {
    render(<SettingsPage />)

    expect(screen.getByRole('heading', { name: 'Change Password' })).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/enter current password/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/enter new password/i)).toBeInTheDocument()
    expect(screen.getByPlaceholderText(/confirm new password/i)).toBeInTheDocument()
  })

  it('shows user management for admin users', () => {
    render(<SettingsPage />)

    expect(screen.getByText('User Management')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /\+ add user/i })).toBeInTheDocument()
  })

  it('hides user management for non-admin users', () => {
    vi.mocked(useAuthStore).mockReturnValue({
      user: { ...mockUser, role: 'user' },
      isAuthenticated: true,
      isLoading: false,
      login: vi.fn(),
      logout: vi.fn(),
      checkAuth: vi.fn(),
    })

    render(<SettingsPage />)

    expect(screen.queryByText('User Management')).not.toBeInTheDocument()
  })

  describe('Change Password', () => {
    it('disables submit button when fields are empty', () => {
      render(<SettingsPage />)

      const submitButton = screen.getByRole('button', { name: /change password/i })
      expect(submitButton).toBeDisabled()
    })

    it('shows error when passwords do not match', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.type(screen.getByPlaceholderText(/enter current password/i), 'oldpass')
      await user.type(screen.getByPlaceholderText(/enter new password/i), 'newpass123')
      await user.type(screen.getByPlaceholderText(/confirm new password/i), 'differentpass')

      await user.click(screen.getByRole('button', { name: /change password/i }))

      expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument()
    })

    it('shows error when new password is too short', async () => {
      const user = userEvent.setup()
      render(<SettingsPage />)

      await user.type(screen.getByPlaceholderText(/enter current password/i), 'oldpass')
      await user.type(screen.getByPlaceholderText(/enter new password/i), 'abc')
      await user.type(screen.getByPlaceholderText(/confirm new password/i), 'abc')

      await user.click(screen.getByRole('button', { name: /change password/i }))

      expect(screen.getByText(/at least 4 characters/i)).toBeInTheDocument()
    })

    it('calls API and shows success message on successful password change', async () => {
      const user = userEvent.setup()
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (url === '/api/auth/change-password') {
          return mockFetchResponse({ message: 'Password updated' })
        }
        if (url === '/api/users') {
          return mockFetchResponse([mockUser])
        }
        return mockFetchResponse({})
      })

      render(<SettingsPage />)

      await user.type(screen.getByPlaceholderText(/enter current password/i), 'oldpass')
      await user.type(screen.getByPlaceholderText(/enter new password/i), 'newpass123')
      await user.type(screen.getByPlaceholderText(/confirm new password/i), 'newpass123')

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await waitFor(() => {
        expect(screen.getByText(/password changed successfully/i)).toBeInTheDocument()
      })
    })

    it('shows error message when API returns error', async () => {
      const user = userEvent.setup()
      vi.mocked(global.fetch).mockImplementation((url) => {
        if (url === '/api/auth/change-password') {
          return mockFetchError('Current password is incorrect')
        }
        if (url === '/api/users') {
          return mockFetchResponse([mockUser])
        }
        return mockFetchResponse({})
      })

      render(<SettingsPage />)

      await user.type(screen.getByPlaceholderText(/enter current password/i), 'wrongpass')
      await user.type(screen.getByPlaceholderText(/enter new password/i), 'newpass123')
      await user.type(screen.getByPlaceholderText(/confirm new password/i), 'newpass123')

      await user.click(screen.getByRole('button', { name: /change password/i }))

      await waitFor(() => {
        expect(screen.getByText(/current password is incorrect/i)).toBeInTheDocument()
      })
    })
  })
})
