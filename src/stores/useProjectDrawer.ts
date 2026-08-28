/**
 * Estado do ProjectDrawer (painel lateral de projeto). Guarda o id do projeto
 * aberto. Sincroniza `activePopup` no useUiStore para o blur do canvas (Fase 8).
 */
import { create } from 'zustand'
import { useUiStore } from './useUiStore'

interface ProjectDrawerState {
  projectId: string | null
  open: (id: string) => void
  close: () => void
}

export const useProjectDrawer = create<ProjectDrawerState>((set) => ({
  projectId: null,
  open: (id) => {
    set({ projectId: id })
    useUiStore.getState().openPopup('project-drawer')
  },
  close: () => {
    set({ projectId: null })
    useUiStore.getState().closePopup()
  },
}))
