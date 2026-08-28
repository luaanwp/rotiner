/**
 * Coluna do quadro — droppable (aceita cards, inclusive vazia) + SortableContext
 * vertical dos post-its. Cabeçalho renomeável e exclusão protegida (não dá pra
 * excluir a última coluna do quadro).
 */
import { useDroppable } from '@dnd-kit/core'
import { SortableContext, verticalListSortingStrategy } from '@dnd-kit/sortable'
import { Plus, Trash2 } from 'lucide-react'
import { StickyNote } from '@/components/canvas/StickyNote'
import { cn } from '@/lib/cn'
import type { BoardColumn, Card } from '@/types/models'

interface Props {
  column: BoardColumn
  cards: Card[]
  canDelete: boolean
  onRename: (title: string) => void
  onDelete: () => void
  onAddCard: () => void
  onEditCard: (
    id: string,
    patch: { title?: string; content?: string | null; color?: string | null },
  ) => void
  onDeleteCard: (id: string) => void
}

export function Column({
  column,
  cards,
  canDelete,
  onRename,
  onDelete,
  onAddCard,
  onEditCard,
  onDeleteCard,
}: Props) {
  const { setNodeRef, isOver } = useDroppable({ id: column.id })

  return (
    <div className="flex w-72 shrink-0 flex-col rounded-xl border border-white/10 bg-black/15">
      <header className="flex items-center gap-1 border-b border-white/10 px-2 py-2">
        <input
          defaultValue={column.title}
          onBlur={(e) => {
            const v = e.target.value.trim()
            if (v && v !== column.title) onRename(v)
            else if (!v) e.target.value = column.title
          }}
          aria-label="Nome da coluna"
          className="min-w-0 flex-1 bg-transparent px-1 text-sm font-semibold text-tinta focus:outline-none"
        />
        <span className="shrink-0 rounded-full bg-white/5 px-1.5 text-xs text-tinta/40 tabular-nums">
          {cards.length}
        </span>
        <button
          type="button"
          onClick={onDelete}
          disabled={!canDelete}
          aria-label="Excluir coluna"
          title={canDelete ? 'Excluir coluna' : 'Não dá pra excluir a última coluna'}
          className="shrink-0 rounded p-1 text-tinta/40 hover:bg-white/5 hover:text-alta disabled:cursor-not-allowed disabled:opacity-30 disabled:hover:text-tinta/40"
        >
          <Trash2 size={14} />
        </button>
      </header>

      <div
        ref={setNodeRef}
        className={cn(
          'flex min-h-16 flex-1 flex-col gap-2 overflow-y-auto p-2 transition-colors',
          isOver && 'bg-roxo/10',
        )}
      >
        <SortableContext
          items={cards.map((c) => c.id)}
          strategy={verticalListSortingStrategy}
        >
          {cards.map((card) => (
            <StickyNote
              key={card.id}
              card={card}
              onEdit={(patch) => onEditCard(card.id, patch)}
              onDelete={() => onDeleteCard(card.id)}
            />
          ))}
        </SortableContext>

        <button
          type="button"
          onClick={onAddCard}
          className="mt-auto flex items-center justify-center gap-1 rounded-lg border border-dashed border-white/10 py-1.5 text-xs text-tinta/40 hover:border-roxo-claro hover:text-tinta/70"
        >
          <Plus size={13} /> post-it
        </button>
      </div>
    </div>
  )
}
