/**
 * Confirmação assíncrona reutilizável: `const ok = await confirm({ ... })`.
 * Um ConfirmDialog montado no shell lê este estado.
 */
import { create } from 'zustand'

interface ConfirmOptions {
  title: string
  message?: string
  confirmLabel?: string
  danger?: boolean
}

interface ConfirmState extends ConfirmOptions {
  open: boolean
  resolve: ((ok: boolean) => void) | null
  confirm: (options: ConfirmOptions) => Promise<boolean>
  accept: () => void
  cancel: () => void
}

export const useConfirm = create<ConfirmState>((set, get) => ({
  open: false,
  title: '',
  message: undefined,
  confirmLabel: undefined,
  danger: false,
  resolve: null,
  confirm: (options) =>
    new Promise<boolean>((resolve) => {
      set({ open: true, resolve, ...options })
    }),
  accept: () => {
    get().resolve?.(true)
    set({ open: false, resolve: null })
  },
  cancel: () => {
    get().resolve?.(false)
    set({ open: false, resolve: null })
  },
}))
