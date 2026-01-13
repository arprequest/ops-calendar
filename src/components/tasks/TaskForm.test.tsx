import { describe, it, expect, vi, beforeEach } from 'vitest'
import { screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { render } from '../../test/test-utils'
import { mockCategories, mockFetchResponse } from '../../test/mocks'
import TaskForm from './TaskForm'

describe('TaskForm', () => {
  const mockOnSubmit = vi.fn()
  const mockOnCancel = vi.fn()

  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(global.fetch).mockImplementation((url) => {
      if (url === '/api/categories') {
        return mockFetchResponse(mockCategories)
      }
      return mockFetchResponse({})
    })
  })

  // Helper to get the recurrence pattern select
  const getRecurrenceSelect = () => {
    const selects = screen.getAllByRole('combobox')
    // The recurrence select is the second one (after category)
    return selects.find(select =>
      (select as HTMLSelectElement).querySelector('option[value="daily"]') !== null
    ) as HTMLSelectElement
  }

  it('renders the form with required fields', async () => {
    render(
      <TaskForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByPlaceholderText(/enter task title/i)).toBeInTheDocument()
    expect(screen.getByText('Category')).toBeInTheDocument()
    expect(screen.getByText('Recurrence Pattern')).toBeInTheDocument()
  })

  it('shows validation by disabling submit when title is empty', async () => {
    render(
      <TaskForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const submitButton = screen.getByRole('button', { name: /save/i })
    expect(submitButton).toBeDisabled()
  })

  it('calls onSubmit with form data when submitted', async () => {
    const user = userEvent.setup()

    render(
      <TaskForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Wait for categories to load
    await waitFor(() => {
      expect(screen.getByRole('option', { name: 'Water Sampling' })).toBeInTheDocument()
    })

    // Fill in the form
    await user.type(screen.getByPlaceholderText(/enter task title/i), 'Test Task')
    const categorySelect = screen.getAllByRole('combobox')[0]
    await user.selectOptions(categorySelect, '1')

    // Submit
    const submitButton = screen.getByRole('button', { name: /save/i })
    await user.click(submitButton)

    expect(mockOnSubmit).toHaveBeenCalledWith(
      expect.objectContaining({
        title: 'Test Task',
        category_id: 1,
        recurrence_type: 'daily',
      })
    )
  })

  it('calls onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup()

    render(
      <TaskForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await user.click(screen.getByRole('button', { name: /cancel/i }))
    expect(mockOnCancel).toHaveBeenCalled()
  })

  it('shows daily options when daily recurrence is selected', async () => {
    render(
      <TaskForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    // Daily is selected by default
    expect(screen.getByText(/every weekday/i)).toBeInTheDocument()
    expect(screen.getByText(/day\(s\)/i)).toBeInTheDocument()
  })

  it('shows weekly options when weekly recurrence is selected', async () => {
    const user = userEvent.setup()

    render(
      <TaskForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const recurrenceSelect = getRecurrenceSelect()
    await user.selectOptions(recurrenceSelect, 'weekly')

    // Should show day selection buttons
    expect(screen.getByTitle('Monday')).toBeInTheDocument()
    expect(screen.getByTitle('Tuesday')).toBeInTheDocument()
    expect(screen.getByText(/week\(s\) on/i)).toBeInTheDocument()
  })

  it('shows monthly options when monthly recurrence is selected', async () => {
    const user = userEvent.setup()

    render(
      <TaskForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const recurrenceSelect = getRecurrenceSelect()
    await user.selectOptions(recurrenceSelect, 'monthly')

    // Should show monthly options section (month(s) text appears multiple times)
    expect(screen.getAllByText(/month\(s\)/i).length).toBeGreaterThan(0)
    // Check that day input is visible (day of month selector)
    const dayInputs = screen.getAllByRole('spinbutton')
    expect(dayInputs.length).toBeGreaterThan(0)
  })

  it('shows yearly options when yearly recurrence is selected', async () => {
    const user = userEvent.setup()

    render(
      <TaskForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    const recurrenceSelect = getRecurrenceSelect()
    await user.selectOptions(recurrenceSelect, 'yearly')

    // Should show year interval and month/day options
    expect(screen.getByText(/year\(s\)/i)).toBeInTheDocument()
    // Check for month options (multiple January options may exist - just verify one is there)
    expect(screen.getAllByRole('option', { name: 'January' }).length).toBeGreaterThan(0)
  })

  it('shows recurrence range options for daily pattern', () => {
    render(
      <TaskForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByText(/range of recurrence/i)).toBeInTheDocument()
    expect(screen.getByText(/start date/i)).toBeInTheDocument()
    expect(screen.getByText(/no end date/i)).toBeInTheDocument()
    expect(screen.getByText(/end by/i)).toBeInTheDocument()
    expect(screen.getByText(/end after/i)).toBeInTheDocument()
  })

  it('shows new category form when + New is clicked', async () => {
    const user = userEvent.setup()

    render(
      <TaskForm
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /\+ new/i })).toBeInTheDocument()
    })

    await user.click(screen.getByRole('button', { name: /\+ new/i }))

    expect(screen.getByPlaceholderText(/new category name/i)).toBeInTheDocument()
  })

  it('loads initial data when provided', async () => {
    render(
      <TaskForm
        initialData={{
          title: 'Existing Task',
          category_id: 2,
          recurrence_type: 'weekly',
          recurrence_config: { type: 'weekly', dayOfWeek: 3, daysOfWeek: [3], interval: 2 },
        }}
        onSubmit={mockOnSubmit}
        onCancel={mockOnCancel}
      />
    )

    expect(screen.getByDisplayValue('Existing Task')).toBeInTheDocument()
  })
})
