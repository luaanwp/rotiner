/**
 * Viewport (§08) — o "mundo" infinito atrás de tudo. Pan arrastando o fundo,
 * zoom na roda do mouse e na pinça (touch) mantendo o ponto sob o cursor fixo
 * (zoom-to-point). Só `transform` na GPU (nunca top/left) pra segurar 60fps.
 * Duplo-clique no vazio cria um post-it livre ali.
 */
import { useRef } from 'react'
import { useCanvasStore, screenToWorld } from '@/stores/useCanvasStore'
import { useCanvasCards } from '@/hooks/useCanvasCards'
import { DottedBackground } from './DottedBackground'
import { CanvasNote } from './CanvasNote'

export function Viewport() {
  const x = useCanvasStore((s) => s.x)
  const y = useCanvasStore((s) => s.y)
  const zoom = useCanvasStore((s) => s.zoom)
  const pan = useCanvasStore((s) => s.pan)
  const zoomAt = useCanvasStore((s) => s.zoomAt)

  const {
    canvasCards,
    createCanvasCard,
    updateCanvasCard,
    moveCanvasCard,
    deleteCanvasCard,
  } = useCanvasCards()

  const rootRef = useRef<HTMLDivElement>(null)
  // ponteiros ativos pra pan (1 dedo) e pinça (2 dedos)
  const pointers = useRef<Map<number, { x: number; y: number }>>(new Map())
  const pinchDist = useRef<number | null>(null)

  const isOnNote = (target: EventTarget | null) =>
    target instanceof Element && target.closest('[data-note]') !== null

  function onPointerDown(e: React.PointerEvent) {
    if (isOnNote(e.target)) return // deixa a nota lidar
    try {
      rootRef.current?.setPointerCapture(e.pointerId)
    } catch {
      // ignora captura inválida (não quebra o pan)
    }
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY })
  }

  function onPointerMove(e: React.PointerEvent) {
    const pts = pointers.current
    if (!pts.has(e.pointerId)) return
    const prev = pts.get(e.pointerId)!
    pts.set(e.pointerId, { x: e.clientX, y: e.clientY })

    if (pts.size === 1) {
      // pan
      pan(e.clientX - prev.x, e.clientY - prev.y)
    } else if (pts.size === 2) {
      // pinça: zoom no ponto médio
      const [a, b] = [...pts.values()]
      const dist = Math.hypot(a.x - b.x, a.y - b.y)
      const rect = rootRef.current!.getBoundingClientRect()
      const cx = (a.x + b.x) / 2 - rect.left
      const cy = (a.y + b.y) / 2 - rect.top
      if (pinchDist.current != null && pinchDist.current > 0) {
        zoomAt(dist / pinchDist.current, cx, cy)
      }
      pinchDist.current = dist
    }
  }

  function endPointer(e: React.PointerEvent) {
    pointers.current.delete(e.pointerId)
    if (pointers.current.size < 2) pinchDist.current = null
  }

  function onWheel(e: React.WheelEvent) {
    const rect = rootRef.current!.getBoundingClientRect()
    const factor = e.deltaY < 0 ? 1.1 : 1 / 1.1
    zoomAt(factor, e.clientX - rect.left, e.clientY - rect.top)
  }

  function onDoubleClick(e: React.MouseEvent) {
    if (isOnNote(e.target)) return
    const rect = rootRef.current!.getBoundingClientRect()
    const w = screenToWorld(e.clientX - rect.left, e.clientY - rect.top, {
      x,
      y,
      zoom,
    })
    createCanvasCard({ x: Math.round(w.x), y: Math.round(w.y) })
  }

  return (
    <div
      ref={rootRef}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPointer}
      onPointerCancel={endPointer}
      onWheel={onWheel}
      onDoubleClick={onDoubleClick}
      className="absolute inset-0 touch-none overflow-hidden"
      style={{ cursor: 'grab' }}
    >
      <DottedBackground />

      {/* mundo — só transform (GPU) */}
      <div
        className="absolute top-0 left-0"
        style={{
          transform: `translate(${x}px, ${y}px) scale(${zoom})`,
          transformOrigin: '0 0',
          willChange: 'transform',
        }}
      >
        {canvasCards.map((card) => (
          <div key={card.id} data-note>
            <CanvasNote
              card={card}
              onMove={(px, py) => moveCanvasCard({ id: card.id, x: px, y: py })}
              onEdit={(patch) => updateCanvasCard({ id: card.id, patch })}
              onDelete={() => deleteCanvasCard(card.id)}
            />
          </div>
        ))}
      </div>
    </div>
  )
}
