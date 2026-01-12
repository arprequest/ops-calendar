import { create } from 'zustand'
import type { TaskInstance, TaskDefinition } from '../types'

interface TaskPanelState {
  // For editing a task instance (from calendar views)
  selectedInstance: TaskInstance | null
  // For editing a task definition (from tasks page)
  selectedDefinition: TaskDefinition | null
  isOpen: boolean

  openInstance: (instance: TaskInstance) => void
  openDefinition: (definition: TaskDefinition) => void
  close: () => void
}

export const useTaskPanelStore = create<TaskPanelState>((set) => ({
  selectedInstance: null,
  selectedDefinition: null,
  isOpen: false,

  openInstance: (instance) =>
    set({
      selectedInstance: instance,
      selectedDefinition: null,
      isOpen: true,
    }),

  openDefinition: (definition) =>
    set({
      selectedInstance: null,
      selectedDefinition: definition,
      isOpen: true,
    }),

  close: () =>
    set({
      selectedInstance: null,
      selectedDefinition: null,
      isOpen: false,
    }),
}))
