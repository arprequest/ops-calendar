import { describe, it, expect, beforeEach } from 'vitest'
import { useTaskPanelStore } from './taskPanelStore'
import { mockTaskInstances, mockTaskDefinitions } from '../test/mocks'

describe('taskPanelStore', () => {
  beforeEach(() => {
    // Reset store to initial state
    useTaskPanelStore.setState({
      selectedInstance: null,
      selectedDefinition: null,
      isOpen: false,
    })
  })

  it('starts with closed state', () => {
    const state = useTaskPanelStore.getState()
    expect(state.isOpen).toBe(false)
    expect(state.selectedInstance).toBeNull()
    expect(state.selectedDefinition).toBeNull()
  })

  it('opens panel with instance', () => {
    const { openInstance } = useTaskPanelStore.getState()
    openInstance(mockTaskInstances[0])

    const state = useTaskPanelStore.getState()
    expect(state.isOpen).toBe(true)
    expect(state.selectedInstance).toEqual(mockTaskInstances[0])
    expect(state.selectedDefinition).toBeNull()
  })

  it('opens panel with definition', () => {
    const { openDefinition } = useTaskPanelStore.getState()
    openDefinition(mockTaskDefinitions[0])

    const state = useTaskPanelStore.getState()
    expect(state.isOpen).toBe(true)
    expect(state.selectedDefinition).toEqual(mockTaskDefinitions[0])
    expect(state.selectedInstance).toBeNull()
  })

  it('clears instance when opening with definition', () => {
    const { openInstance, openDefinition } = useTaskPanelStore.getState()

    openInstance(mockTaskInstances[0])
    expect(useTaskPanelStore.getState().selectedInstance).not.toBeNull()

    openDefinition(mockTaskDefinitions[0])
    expect(useTaskPanelStore.getState().selectedInstance).toBeNull()
    expect(useTaskPanelStore.getState().selectedDefinition).not.toBeNull()
  })

  it('clears definition when opening with instance', () => {
    const { openInstance, openDefinition } = useTaskPanelStore.getState()

    openDefinition(mockTaskDefinitions[0])
    expect(useTaskPanelStore.getState().selectedDefinition).not.toBeNull()

    openInstance(mockTaskInstances[0])
    expect(useTaskPanelStore.getState().selectedDefinition).toBeNull()
    expect(useTaskPanelStore.getState().selectedInstance).not.toBeNull()
  })

  it('closes panel and clears selection', () => {
    const { openInstance, close } = useTaskPanelStore.getState()

    openInstance(mockTaskInstances[0])
    expect(useTaskPanelStore.getState().isOpen).toBe(true)

    close()

    const state = useTaskPanelStore.getState()
    expect(state.isOpen).toBe(false)
    expect(state.selectedInstance).toBeNull()
    expect(state.selectedDefinition).toBeNull()
  })
})
