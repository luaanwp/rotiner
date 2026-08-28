/**
 * Câmera do canvas infinito (§08). Guarda a posição/zoom do "mundo" e as ações
 * de pan/zoom. Regra de ouro (§17): mover só por `transform` na GPU, nunca
 * top/left — daí a câmera viver aqui e o Viewport só aplicar o transform.
 *
 * Modelo: um ponto do mundo (wx,wy) é desenhado na tela em
 *   screen = world * zoom + camera   →   world = (screen - camera) / zoom
 */
import { create } from 'zustand'

const MIN_ZOOM = 0.3
const MAX_ZOOM = 3

interface CanvasState {
  x: number
  y: number
  zoom: number
  pan: (dx: number, dy: number) => void
  /** zoom mantendo o ponto de TELA (sx,sy) fixo sob o cursor (zoom-to-point). */
  zoomAt: (factor: number, sx: number, sy: number) => void
  reset: () => void
}

const clampZoom = (z: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z))

export const useCanvasStore = create<CanvasState>((set) => ({
  x: 0,
  y: 0,
  zoom: 1,
  pan: (dx, dy) => set((s) => ({ x: s.x + dx, y: s.y + dy })),
  zoomAt: (factor, sx, sy) =>
    set((s) => {
      const z2 = clampZoom(s.zoom * factor)
      if (z2 === s.zoom) return s
      // mantém (sx,sy) fixo: cam2 = s - (s - cam1) * (z2/z1)
      const ratio = z2 / s.zoom
      return {
        zoom: z2,
        x: sx - (sx - s.x) * ratio,
        y: sy - (sy - s.y) * ratio,
      }
    }),
  reset: () => set({ x: 0, y: 0, zoom: 1 }),
}))

/** Converte um ponto de tela para coordenada do mundo com a câmera atual. */
export function screenToWorld(
  sx: number,
  sy: number,
  cam: { x: number; y: number; zoom: number },
) {
  return { x: (sx - cam.x) / cam.zoom, y: (sy - cam.y) / cam.zoom }
}
