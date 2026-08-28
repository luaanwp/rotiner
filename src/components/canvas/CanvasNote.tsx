/**
 * Post-it LIVRE no canvas (§08) — posicionado por pos_x/pos_y no mundo. Arrasta
 * pela alça; o delta de TELA vira delta de MUNDO dividindo pelo zoom, então o
 * post-it acompanha o cursor em qualquer nível de zoom. Persiste só ao soltar.
 */
import { useRef, useState } from 'react'
import { GripVertical, Trash2 } from 'lucide-react'
import { useCanvasStore } from '@/stores/useCanvasStore'
import { CARD_COLORS, cardColorHex } from '@/lib/domainMeta'
import { cn } from '@/lib/cn'
import type { Card } from '@/types/models'

interface Props {
  card: Card
  onMove: (x: number, y: number) => void
  onEdit: (patch: { title?: string; content?: string | null; color?: string | null }) => void
  onDelete: () => void
}

export function CanvasNote({ card, onMove, onEdit, onDelete }: Props) {
  // posição visual local durante o arraste (evita esperar o round-trip)
  const [pos, setPos] = useState({ x: card.posX ?? 0, y: card.posY ?? 0 })
  // ref com a posição corrente do arraste — lida no soltar (state pode estar
  // defasado dentro do mesmo tick).
  const drag = useRef<{
    sx: number
    sy: number
    ox: number
    oy: number
    curX: number
    curY: number
  } | null>(null)

  // fora do arraste, segue a posição do servidor
  const shown = drag.current ? pos : { x: card.posX ?? 0, y: card.posY ?? 0 }

  function onPointerDown(e: React.PointerEvent) {
    e.stopPropagation() // não deixa virar pan do canvas
    try {
      ;(e.target as Element).setPointerCapture(e.pointerId)
    } catch {
      // ignora captura inválida
    }
    drag.current = {
      sx: e.clientX,
      sy: e.clientY,
      ox: shown.x,
      oy: shown.y,
      curX: shown.x,
      curY: shown.y,
    }
    setPos(shown)
  }
  function onPointerMove(e: React.PointerEvent) {
    if (!drag.current) return
    const { zoom } = useCanvasStore.getState()
    const x = drag.current.ox + (e.clientX - drag.current.sx) / zoom
    const y = drag.current.oy + (e.clientY - drag.current.sy) / zoom
    drag.current.curX = x
    drag.current.curY = y
    setPos({ x, y })
  }
  function onPointerUp() {
    if (!drag.current) return
    const { curX, curY } = drag.current
    drag.current = null
    onMove(Math.round(curX), Math.round(curY))
  }

  return (
    <div
      className="group absolute w-52 rounded-lg border border-white/10 border-l-4 bg-painel px-2.5 py-2 shadow-lg"
      style={{ left: shown.x, top: shown.y, borderLeftColor: cardColorHex(card.color) }}
    >
      <div className="flex items-start gap-1.5">
        <button
          type="button"
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          aria-label="Mover post-it"
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
          className="shrink-0 rounded p-0.5 text-tinta/30 opacity-0 transition-opacity group-hover:opacity-100 hover:text-alta"
        >
          <Trash2 size={14} />
        </button>
      </div>

      <div className="mt-1.5 flex gap-1.5 pl-[22px] opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
        {CARD_COLORS.map((c) => (
          <button
            key={c.value}
            type="button"
            onClick={() => onEdit({ color: c.value === 'roxo' ? null : c.value })}
            aria-label={`Cor ${c.name}`}
            title={c.name}
            className={cn(
              'h-3 w-3 rounded-full transition-transform hover:scale-125',
              (card.color ?? 'roxo') === c.value && 'ring-2 ring-white/60',
            )}
            style={{ backgroundColor: c.swatch }}
          />
        ))}
      </div>
    </div>
  )
}
