/**
 * Estado de UI global (§08) — view ativa, busca contextual e popup ativo.
 * Zustand, sem boilerplate. NÃO guarda dados de domínio (isso é React Query).
 */
import { create } from 'zustand'

export type ViewId = 'hoje' | 'rotinas' | 'calendario' | 'projetos' | 'quadros'

/** id do popup ativo (Composer, ProjectDrawer, …) — usado pelo blur do canvas (Fase 8). */
export type PopupId = string

interface UiState {
  view: ViewId
  setView: (view: ViewId) => void

  search: string
  setSearch: (search: string) => void

  activePopup: PopupId | null
  openPopup: (id: PopupId) => void
  closePopup: () => void
}

export const useUiStore = create<UiState>((set) => ({
  view: 'hoje',
  setView: (view) => set({ view, search: '' }),

  search: '',
  setSearch: (search) => set({ search }),

  activePopup: null,
  openPopup: (activePopup) => set({ activePopup }),
  closePopup: () => set({ activePopup: null }),
}))
