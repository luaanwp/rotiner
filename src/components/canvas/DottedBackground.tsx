/**
 * Fundo de bolinhas (§07/§08) — puro CSS (radial-gradient), custo zero de JS.
 * O tamanho das bolinhas acompanha o zoom (24px * zoom) e a posição acompanha
 * o pan da câmera, então elas "vivem" no mundo sem um elemento gigante escalado.
 */
import { useCanvasStore } from '@/stores/useCanvasStore'

export function DottedBackground() {
  const x = useCanvasStore((s) => s.x)
  const y = useCanvasStore((s) => s.y)
  const zoom = useCanvasStore((s) => s.zoom)
  const size = 24 * zoom

  return (
    <div
      aria-hidden
      className="pointer-events-none absolute inset-0"
      style={{
        backgroundImage:
          'radial-gradient(var(--color-dot) 1.5px, transparent 1.5px)',
        backgroundSize: `${size}px ${size}px`,
        backgroundPosition: `${x}px ${y}px`,
      }}
    />
  )
}
