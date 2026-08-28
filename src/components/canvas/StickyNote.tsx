/**
 * StickyNote — post-it. Usado nos Quadros (Fase 7, dentro de um sortable) e
 * reaproveitado no canvas livre (Fase 8). Alça de arrastar (GripVertical),
 * cor, título e conteúdo editáveis inline (autosave no blur).
 */
import { useSortable } from '@dnd-kit/sortable'
import { CSS } from '@dnd-kit/utilities'
import { GripVertical, Trash2 } from 'lucide-react'
import { CARD_COLORS, cardColorHex } from '@/lib/domainMeta'
import { cn } from '@/lib/cn'
import type { Card } from '@/types/models'

interface Props {
  card: Card
  onEdit: (patch: { title?: string; content?: string | null; color?: string | null }) => void
  onDelete: () => void
}

export function StickyNote({ card, onEdit, onDelete }: Props) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } =
    useSortable({ id: card.id })

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    borderLeftColor: cardColorHex(card.color),
  }

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        'group rounded-lg border border-white/10 border-l-4 bg-painel px-2.5 py-2 shadow-sm',
        isDragging && 'opacity-40',
      )}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          {...attributes}
          {...listeners}
          aria-label="Arrastar post-it"
          className="mt-0.5 shrink-0 cursor-grab touch-none text-tinta/30 hover:text-tinta/60 active:cursor-grabbing"
        >
          <GripVertical size={16} />
        </button>

        <div className="min-w-0 flex-1">
          <input
            defaultValue={card.title}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v && v !== card.title) onEdit({ title: v })
              else if (!v) e.target.value = card.title
            }}
            aria-label="Título do post-it"
            className="w-full bg-transparent text-sm font-medium text-tinta focus:outline-none"
          />
          <textarea
            defaultValue={card.content ?? ''}
            onBlur={(e) => {
              const v = e.target.value.trim()
              if (v !== (card.content ?? '')) onEdit({ content: v || null })
            }}
            placeholder="detalhe…"
            rows={card.content ? 2 : 1}
            aria-label="Conteúdo do post-it"
            className="mt-0.5 w-full resize-none bg-transparent text-xs text-tinta/60 placeholder:text-tinta/25 focus:outline-none"
          />
        </div>

        <button
          type="button"
          onClick={onDelete}
          aria-label="Excluir post-it"
          className="shrink-0 rounded p-0.5 text-tinta/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-alta focus-visible:opacity-100"
        >
          <Trash2 size={14} />
        </button>
      </div>

      {/* seletor de cor — aparece no hover */}
      <div className="mt-1.5 flex gap-1.5 pl-[22px] opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {CARD_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onEdit({ color: c.value === 'roxo' ? null : c.value })}
            aria-label={`Cor ${c.name}`}
            title={c.name}
            className={cn(
              'h-3 w-3 rounded-full ring-offset-1 ring-offset-painel transition-transform hover:scale-125',
              (card.color ?? 'roxo') === c.value && 'ring-2 ring-white/60',
            )}
            style={{ backgroundColor: c.swatch }}
          />
        ))}
      </div>
    </div>
  )
}
