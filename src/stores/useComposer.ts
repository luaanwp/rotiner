/**
 * Estado do Composer (popup de criar/editar tarefa OU nota). Guarda o alvo de
 * edição e os valores pré-preenchidos (ex.: clique num horário do calendário →
 * nota com date+time). Sincroniza `activePopup` no useUiStore para o blur do
 * canvas (Fase 8).
 */
import { create } from 'zustand'
import type { Note, Task } from '@/types/models'
import type { TaskInput } from '@/hooks/useTasks'
import type { NoteInput } from '@/hooks/useNotes'
import { useUiStore } from './useUiStore'

export type ComposerKind = 'task' | 'note'

interface ComposerState {
  open: boolean
  kind: ComposerKind
  // tarefa
  editingTask: Task | null
  taskPrefill: Partial<TaskInput> | null
  // nota
  editingNote: Note | null
  notePrefill: Partial<NoteInput> | null

  openNewTask: (prefill?: Partial<TaskInput>) => void
  openEditTask: (task: Task) => void
  openNewNote: (prefill?: Partial<NoteInput>) => void
  openEditNote: (note: Note) => void
  close: () => void
}

const cleared = {
  editingTask: null,
  taskPrefill: null,
  editingNote: null,
  notePrefill: null,
} as const

export const useComposer = create<ComposerState>((set) => ({
  open: false,
  kind: 'task',
  ...cleared,

  openNewTask: (prefill) => {
    set({ open: true, kind: 'task', ...cleared, taskPrefill: prefill ?? null })
    useUiStore.getState().openPopup('composer')
  },
  openEditTask: (task) => {
    set({ open: true, kind: 'task', ...cleared, editingTask: task })
    useUiStore.getState().openPopup('composer')
  },
  openNewNote: (prefill) => {
    set({ open: true, kind: 'note', ...cleared, notePrefill: prefill ?? null })
    useUiStore.getState().openPopup('composer')
  },
  openEditNote: (note) => {
    set({ open: true, kind: 'note', ...cleared, editingNote: note })
    useUiStore.getState().openPopup('composer')
  },
  close: () => {
    set({ open: false, ...cleared })
    useUiStore.getState().closePopup()
  },
}))
