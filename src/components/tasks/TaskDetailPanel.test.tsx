import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/test-utils'
import { mockCategories, mockTaskInstances, mockFetchResponse } from '../../test/mocks'
import TaskDetailPanel from './TaskDetailPanel'
import { useTaskPanelStore } from '../../stores/taskPanelStore'

describe('TaskDetailPanel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    // Reset the store
    useTaskPanelStore.setState({
      selectedInstance: null,
      selectedDefinition: null,
      isOpen: false,
    })

    vi.mocked(global.fetch).mockImplementation((url) => {
      if (url === '/api/categories') {
        return mockFetchResponse(mockCategories)
      }
      return mockFetchResponse({})
    })
  })

  it('does not render when closed', () => {
    render(<TaskDetailPanel />)
    expect(screen.queryByText(/task details/i)).not.toBeInTheDocument()
  })

  it('renders when opened with an instance', async () => {
    useTaskPanelStore.setState({
      selectedInstance: mockTaskInstances[0],
      isOpen: true,
    })

    render(<TaskDetailPanel />)

    await waitFor(() => {
      expect(screen.getByText('Chlorine Residual')).toBeInTheDocument()
    })
  })

  it('shows task status buttons', async () => {
    useTaskPanelStore.setState({
      selectedInstance: mockTaskInstances[0],
      isOpen: true,
    })

    render(<TaskDetailPanel />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /pending/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /skipped/i })).toBeInTheDocument()
    })
  })

  it('shows scheduled date for instance', async () => {
    useTaskPanelStore.setState({
      selectedInstance: mockTaskInstances[0],
      selectedDefinition: null,
      isOpen: true,
    })

    render(<TaskDetailPanel />)

    // Wait for panel content to load including the scheduled date section
    await waitFor(() => {
      expect(screen.getByText(/scheduled date/i)).toBeInTheDocument()
    })
    // Verify a date is displayed (format is "EEEE, MMMM d, yyyy")
    // The actual date depends on the mock instance used
    expect(screen.getByText(/january \d+, 2024/i)).toBeInTheDocument()
  })

  it('shows notes textarea', async () => {
    useTaskPanelStore.setState({
      selectedInstance: mockTaskInstances[0],
      isOpen: true,
    })

    render(<TaskDetailPanel />)

    await waitFor(() => {
      expect(screen.getByPlaceholderText(/add notes/i)).toBeInTheDocument()
    })
  })

  it('closes panel when backdrop is clicked', async () => {
    const user = userEvent.setup()

    useTaskPanelStore.setState({
      selectedInstance: mockTaskInstances[0],
      isOpen: true,
    })

    render(<TaskDetailPanel />)

    await waitFor(() => {
      expect(screen.getByText('Chlorine Residual')).toBeInTheDocument()
    })

    // Click backdrop
    const backdrop = document.querySelector('.bg-black.bg-opacity-30')
    if (backdrop) {
      await user.click(backdrop)
    }

    expect(useTaskPanelStore.getState().isOpen).toBe(false)
  })

  it('shows edit button', async () => {
    useTaskPanelStore.setState({
      selectedInstance: mockTaskInstances[0],
      isOpen: true,
    })

    render(<TaskDetailPanel />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit task definition/i })).toBeInTheDocument()
    })
  })

  it('shows delete button', async () => {
    useTaskPanelStore.setState({
      selectedInstance: mockTaskInstances[0],
      isOpen: true,
    })

    render(<TaskDetailPanel />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /delete task/i })).toBeInTheDocument()
    })
  })

  it('switches to edit mode when edit button is clicked', async () => {
    const user = userEvent.setup()

    useTaskPanelStore.setState({
      selectedInstance: mockTaskInstances[0],
      isOpen: true,
    })

    render(<TaskDetailPanel />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /edit task definition/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /edit task definition/i }))

    await waitFor(() => {
      expect(screen.getByText(/edit task/i)).toBeInTheDocument()
      expect(screen.getByPlaceholderText(/enter task title/i)).toBeInTheDocument()
    })
  })

  it('updates status when status button is clicked', async () => {
    const user = userEvent.setup()
    const mockPut = vi.fn().mockImplementation(() => mockFetchResponse({}))
    vi.mocked(global.fetch).mockImplementation((url, options) => {
      if (url === '/api/categories') {
        return mockFetchResponse(mockCategories)
      }
      if (options?.method === 'PUT') {
        return mockPut()
      }
      return mockFetchResponse({})
    })

    useTaskPanelStore.setState({
      selectedInstance: mockTaskInstances[0],
      isOpen: true,
    })

    render(<TaskDetailPanel />)

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /completed/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /completed/i }))

    await waitFor(() => {
      expect(mockPut).toHaveBeenCalled()
    })
  })
})
