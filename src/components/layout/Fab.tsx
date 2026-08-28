/**
 * FAB (§05 RF-12) — botão âmbar flutuante que abre o Composer em "nova tarefa".
 * Canto inferior direito; no mobile fica acima da navegação inferior.
 */
import { Plus } from 'lucide-react'
import { useComposer } from '@/stores/useComposer'

export function Fab() {
  const openNewTask = useComposer((s) => s.openNewTask)

  return (
    <button
      type="button"
      onClick={() => openNewTask()}
      aria-label="Criar tarefa"
      className="pointer-events-auto fixed right-5 bottom-20 z-30 flex h-14 w-14 items-center justify-center rounded-full bg-ambar text-bg shadow-lg shadow-black/30 transition-transform hover:scale-105 active:scale-95 md:bottom-6"
    >
      <Plus size={26} strokeWidth={2.5} />
    </button>
  )
}
