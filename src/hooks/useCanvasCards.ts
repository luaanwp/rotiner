/**
 * Post-its livres do canvas (§08) — cards com column_id NULL, posicionados por
 * pos_x/pos_y no mundo. React Query, mutations otimistas. O arraste persiste só
 * ao soltar (moveCanvasCard).
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Card } from '@/types/models'

const KEY = ['canvas-cards'] as const

interface CardRow {
  id: string
  user_id: string
  column_id: string | null
  title: string
  content: string | null
  color: string | null
  pos_x: number | null
  pos_y: number | null
  position: number
  created_at: string
  updated_at: string
}

function rowToCard(r: CardRow): Card {
  return {
    id: r.id,
    userId: r.user_id,
    columnId: r.column_id ?? '',
    title: r.title,
    content: r.content,
    color: r.color,
    posX: r.pos_x,
    posY: r.pos_y,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export function useCanvasCardsQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Card[]> => {
      const { data, error } = await supabase
        .from('cards')
        .select('*')
        .is('column_id', null)
      if (error) throw error
      return (data as CardRow[]).map(rowToCard)
    },
  })
}

function patchCache(qc: QueryClient, fn: (prev: Card[]) => Card[]) {
  const prev = qc.getQueryData<Card[]>(KEY) ?? []
  qc.setQueryData<Card[]>(KEY, fn([...prev]))
  return prev
}

export function useCanvasCards() {
  const qc = useQueryClient()
  const query = useCanvasCardsQuery()

  const rollback = (_e: unknown, _v: unknown, ctx: { prev: Card[] } | undefined) => {
    if (ctx) qc.setQueryData(KEY, ctx.prev)
  }
  const settle = () => void qc.invalidateQueries({ queryKey: KEY })

  const createCanvasCard = useMutation({
    mutationFn: async ({
      x,
      y,
      title,
    }: {
      x: number
      y: number
      title?: string
    }) => {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (!userId) throw new Error('Sem sessão.')
      const { error } = await supabase.from('cards').insert({
        user_id: userId,
        column_id: null,
        title: title ?? 'Nota',
        pos_x: x,
        pos_y: y,
      })
      if (error) throw error
    },
    onSettled: settle,
  })

  const updateCanvasCard = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: { title?: string; content?: string | null; color?: string | null }
    }) => {
      const { error } = await supabase.from('cards').update(patch).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (list) =>
        list.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      )
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  const moveCanvasCard = useMutation({
    mutationFn: async ({ id, x, y }: { id: string; x: number; y: number }) => {
      const { error } = await supabase
        .from('cards')
        .update({ pos_x: x, pos_y: y })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, x, y }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (list) =>
        list.map((c) => (c.id === id ? { ...c, posX: x, posY: y } : c)),
      )
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  const deleteCanvasCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cards').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (list) => list.filter((c) => c.id !== id))
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  return {
    canvasCards: query.data ?? [],
    isLoading: query.isLoading,
    createCanvasCard: createCanvasCard.mutate,
    updateCanvasCard: updateCanvasCard.mutate,
    moveCanvasCard: moveCanvasCard.mutate,
    deleteCanvasCard: deleteCanvasCard.mutate,
  }
}
