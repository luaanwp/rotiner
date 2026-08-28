/**
 * Quadros (§05 RF-09) — colunas horizontais com post-its arrastáveis entre
 * colunas e reordenáveis dentro (dnd-kit, sensores mouse + touch). A ordem só
 * é persistida ao SOLTAR (moveCard, otimista). Um estado local espelha a ordem
 * durante o arraste pra dar preview fluido.
 */
import { useMemo, useRef, useState } from 'react'
import {
  DndContext,
  DragOverlay,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  closestCorners,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
} from '@dnd-kit/core'
import { arrayMove, sortableKeyboardCoordinates } from '@dnd-kit/sortable'
import { Plus } from 'lucide-react'
import { useBoards } from '@/hooks/useBoards'
import { Column } from '@/components/boards/Column'
import { cardColorHex } from '@/lib/domainMeta'
import type { Card } from '@/types/models'

type Order = Record<string, string[]>

export default function BoardsView() {
  const {
    columns,
    cards,
    isLoading,
    createColumn,
    renameColumn,
    deleteColumn,
    createCard,
    updateCard,
    deleteCard,
    moveCard,
  } = useBoards()

  const cardsMap = useMemo(() => {
    const m: Record<string, Card> = {}
    for (const c of cards) m[c.id] = c
    return m
  }, [cards])

  // ordem "de verdade", derivada do servidor (React Query). SEM useEffect/setState
  // pra evitar loop de render.
  const baseOrder = useMemo<Order>(() => {
    const next: Order = {}
    for (const col of columns) {
      next[col.id] = cards.filter((c) => c.columnId === col.id).map((c) => c.id)
    }
    return next
  }, [cards, columns])

  // override existe só DURANTE o arraste (preview fluido). Fora do drag, usamos
  // baseOrder direto — o moveCard otimista já atualiza o cache, então soltar não
  // pisca.
  const [override, setOverride] = useState<Order | null>(null)
  const [activeId, setActiveId] = useState<string | null>(null)
  const fromCol = useRef<string | null>(null)
  const order = override ?? baseOrder

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 5 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  )

  const findContainer = (o: Order, id: string): string | null => {
    if (id in o) return id
    return Object.keys(o).find((col) => o[col].includes(id)) ?? null
  }

  function handleDragStart(e: DragStartEvent) {
    setActiveId(String(e.active.id))
    fromCol.current = cardsMap[String(e.active.id)]?.columnId ?? null
    setOverride(baseOrder)
  }

  function handleDragOver(e: DragOverEvent) {
    const { active, over } = e
    if (!over) return
    setOverride((prev) => {
      const src = prev ?? baseOrder
      const activeCol = findContainer(src, String(active.id))
      const overCol = findContainer(src, String(over.id))
      if (!activeCol || !overCol || activeCol === overCol) return src
      const activeItems = src[activeCol].filter((id) => id !== active.id)
      const overItems = [...src[overCol]]
      const overIdx = overItems.indexOf(String(over.id))
      const insertAt = overIdx >= 0 ? overIdx : overItems.length
      overItems.splice(insertAt, 0, String(active.id))
      return { ...src, [activeCol]: activeItems, [overCol]: overItems }
    })
  }

  function handleDragEnd(e: DragEndEvent) {
    const { active, over } = e
    const from = fromCol.current
    const activeId = String(active.id)
    const current = override ?? baseOrder
    setActiveId(null)
    fromCol.current = null
    setOverride(null)
    if (!over || !from) return

    const overCol = findContainer(current, String(over.id))
    if (!overCol) return

    const items = current[overCol] ?? []
    const oldIdx = items.indexOf(activeId)
    const overIdx = items.indexOf(String(over.id))
    let next: string[]
    if (oldIdx >= 0) {
      const target = overIdx >= 0 ? overIdx : items.length - 1
      next = arrayMove(items, oldIdx, target)
    } else {
      next = items.includes(activeId) ? [...items] : [...items, activeId]
    }
    const toIndex = next.indexOf(activeId)

    // moveCard.onMutate atualiza o cache otimista → baseOrder já reflete o
    // destino no próximo render; por isso limpar o override não pisca.
    moveCard({ cardId: activeId, fromColumnId: from, toColumnId: overCol, toIndex })
  }

  function handleDragCancel() {
    setActiveId(null)
    fromCol.current = null
    setOverride(null)
  }

  if (isLoading) {
    return <p className="p-6 text-sm text-tinta/40">Carregando quadro…</p>
  }

  const activeCard = activeId ? cardsMap[activeId] : null

  return (
    <div className="pointer-events-auto h-full overflow-x-auto p-4 md:px-8">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCorners}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
        onDragCancel={handleDragCancel}
      >
        <div className="flex h-full items-start gap-3">
          {columns.map((col) => (
            <Column
              key={col.id}
              column={col}
              cards={(order[col.id] ?? []).map((id) => cardsMap[id]).filter(Boolean)}
              canDelete={columns.length > 1}
              onRename={(title) => renameColumn({ id: col.id, title })}
              onDelete={() => deleteColumn(col.id)}
              onAddCard={() => createCard({ columnId: col.id, title: 'Novo post-it' })}
              onEditCard={(id, patch) => updateCard({ id, patch })}
              onDeleteCard={(id) => deleteCard(id)}
            />
          ))}

          <button
            type="button"
            onClick={() => createColumn('Nova coluna')}
            className="flex w-56 shrink-0 items-center justify-center gap-1.5 rounded-xl border border-dashed border-white/15 py-3 text-sm text-tinta/40 hover:border-roxo-claro hover:text-tinta/70"
          >
            <Plus size={16} /> Nova coluna
          </button>
        </div>

        <DragOverlay>
          {activeCard && (
            <div
              className="rounded-lg border border-white/10 border-l-4 bg-painel px-2.5 py-2 text-sm font-medium text-tinta shadow-xl"
              style={{ borderLeftColor: cardColorHex(activeCard.color) }}
            >
              {activeCard.title}
            </div>
          )}
        </DragOverlay>
      </DndContext>
    </div>
  )
}
