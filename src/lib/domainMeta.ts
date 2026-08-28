/**
 * Metadados de apresentação do domínio (§07) — cores semânticas de prioridade
 * e status. As classes usam os tokens do @theme (bg-alta, text-media, …).
 */
import type { Priority, ProjectStatus } from '@/types/models'

export const PRIORITY_META: Record<
  Priority,
  { label: string; dot: string; text: string }
> = {
  alta: { label: 'Alta', dot: 'bg-alta', text: 'text-alta' },
  media: { label: 'Média', dot: 'bg-media', text: 'text-media' },
  baixa: { label: 'Baixa', dot: 'bg-baixa', text: 'text-baixa' },
}

export const PRIORITY_ORDER: Priority[] = ['alta', 'media', 'baixa']

export const STATUS_META: Record<
  ProjectStatus,
  { label: string; dot: string; text: string; bar: string }
> = {
  andamento: { label: 'Em andamento', dot: 'bg-andamento', text: 'text-andamento', bar: 'bg-andamento' },
  pausado: { label: 'Pausado', dot: 'bg-media', text: 'text-media', bar: 'bg-media' },
  ideia: { label: 'Ideia', dot: 'bg-baixa', text: 'text-baixa', bar: 'bg-baixa' },
  concluido: { label: 'Concluído', dot: 'bg-concluido', text: 'text-concluido', bar: 'bg-concluido' },
}

export const STATUS_ORDER: ProjectStatus[] = ['andamento', 'pausado', 'ideia', 'concluido']

/**
 * Cores dos post-its (§07) — usadas nos Quadros (Fase 7) e no canvas (Fase 8).
 * O primeiro (roxo) é o default (color = null). `value` vai pro banco.
 */
export const CARD_COLORS: { name: string; value: string; swatch: string }[] = [
  { name: 'Roxo', value: 'roxo', swatch: '#7c3aed' },
  { name: 'Âmbar', value: 'ambar', swatch: '#f59e0b' },
  { name: 'Rose', value: 'rose', swatch: '#f43f5e' },
  { name: 'Ciano', value: 'ciano', swatch: '#22d3ee' },
  { name: 'Esmeralda', value: 'esmeralda', swatch: '#10b981' },
]

/** hex de um valor de cor de card (fallback = roxo). */
export function cardColorHex(value: string | null | undefined): string {
  return CARD_COLORS.find((c) => c.value === value)?.swatch ?? '#7c3aed'
}
