/**
 * Quadros (§05 RF-09, §06) via React Query. Uma única query ['board'] carrega
 * o quadro ativo + colunas + cards (assim o moveCard otimista mora num lugar
 * só). Auto-cria um quadro default no primeiro acesso. Componente NUNCA fala
 * com o Supabase direto.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { BoardColumn, Card } from '@/types/models'

const KEY = ['board'] as const

// refs estáveis pro fallback vazio — senão `?? []` cria array novo a cada
// render e faz o useEffect de sync do BoardsView entrar em loop.
const EMPTY_COLUMNS: BoardColumn[] = []
const EMPTY_CARDS: Card[] = []

interface ColumnRow {
  id: string
  user_id: string
  board_id: string
  title: string
  position: number
  created_at: string
  updated_at: string
}
interface CardRow {
  id: string
  user_id: string
  column_id: string
  title: string
  content: string | null
  color: string | null
  pos_x: number | null
  pos_y: number | null
  position: number
  created_at: string
  updated_at: string
}

function rowToColumn(r: ColumnRow): BoardColumn {
  return {
    id: r.id,
    userId: r.user_id,
    boardId: r.board_id,
    title: r.title,
    position: r.position,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}
function rowToCard(r: CardRow): Card {
  return {
    id: r.id,
    userId: r.user_id,
    columnId: r.column_id,
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

export interface BoardData {
  boardId: string
  columns: BoardColumn[]
  cards: Card[]
}

const byPos = (a: { position: number }, b: { position: number }) =>
  a.position - b.position

async function requireUserId(): Promise<string> {
  const { data } = await supabase.auth.getUser()
  const id = data.user?.id
  if (!id) throw new Error('Sem sessão.')
  return id
}

// ─── Query (com auto-criação do quadro default) ─────────────────────────────
export function useBoardQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<BoardData> => {
      const userId = await requireUserId()

      let { data: boards, error } = await supabase.from('boards').select('id').limit(1)
      if (error) throw error

      // primeiro acesso: cria quadro + 3 colunas default
      if (!boards || boards.length === 0) {
        const { data: board, error: be } = await supabase
          .from('boards')
          .insert({ user_id: userId, title: 'Meu quadro' })
          .select('id')
          .single()
        if (be) throw be
        const defaults = ['A fazer', 'Fazendo', 'Feito']
        const { error: ce } = await supabase.from('board_columns').insert(
          defaults.map((title, position) => ({
            user_id: userId,
            board_id: board.id,
            title,
            position,
          })),
        )
        if (ce) throw ce
        boards = [{ id: board.id }]
      }

      const boardId = boards[0].id
      const [{ data: cols, error: cErr }, { data: cards, error: kErr }] =
        await Promise.all([
          supabase.from('board_columns').select('*').eq('board_id', boardId),
          // só cards de coluna — os de column_id null são post-its livres do canvas (Fase 8)
          supabase.from('cards').select('*').not('column_id', 'is', null),
        ])
      if (cErr) throw cErr
      if (kErr) throw kErr

      return {
        boardId,
        columns: (cols as ColumnRow[]).map(rowToColumn).sort(byPos),
        cards: (cards as CardRow[]).map(rowToCard).sort(byPos),
      }
    },
  })
}

// ─── Reordenação pura (usada pelo optimistic do moveCard) ───────────────────
export function computeMove(
  cards: Card[],
  cardId: string,
  fromColumnId: string,
  toColumnId: string,
  toIndex: number,
): Card[] {
  const moved = cards.find((c) => c.id === cardId)
  if (!moved) return cards
  const others = cards.filter((c) => c.id !== cardId)

  const target = others.filter((c) => c.columnId === toColumnId).sort(byPos)
  const insertAt = Math.max(0, Math.min(toIndex, target.length))
  target.splice(insertAt, 0, { ...moved, columnId: toColumnId })
  const targetReindexed = target.map((c, i) => ({ ...c, position: i }))

  const sourceReindexed =
    fromColumnId === toColumnId
      ? []
      : others
          .filter((c) => c.columnId === fromColumnId)
          .sort(byPos)
          .map((c, i) => ({ ...c, position: i }))

  const touched = new Set([toColumnId, fromColumnId])
  const untouched = others.filter((c) => !touched.has(c.columnId))
  return [...untouched, ...targetReindexed, ...sourceReindexed]
}

function patchCache(qc: QueryClient, fn: (prev: BoardData) => BoardData) {
  const prev = qc.getQueryData<BoardData>(KEY)
  if (!prev) return undefined
  qc.setQueryData<BoardData>(KEY, fn(prev))
  return prev
}

export function useBoards() {
  const qc = useQueryClient()
  const query = useBoardQuery()
  const data = query.data

  const rollback = (
    _e: unknown,
    _v: unknown,
    ctx: { prev: BoardData | undefined } | undefined,
  ) => {
    if (ctx?.prev) qc.setQueryData(KEY, ctx.prev)
  }
  const settle = () => void qc.invalidateQueries({ queryKey: KEY })

  // ─── Colunas ───────────────────────────────────────────────────────────
  const createColumn = useMutation({
    mutationFn: async (title: string) => {
      if (!data) throw new Error('Quadro não carregado.')
      const userId = await requireUserId()
      const position = data.columns.length
      const { error } = await supabase.from('board_columns').insert({
        user_id: userId,
        board_id: data.boardId,
        title,
        position,
      })
      if (error) throw error
    },
    onSettled: settle,
  })

  const renameColumn = useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from('board_columns')
        .update({ title })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, title }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (d) => ({
        ...d,
        columns: d.columns.map((c) => (c.id === id ? { ...c, title } : c)),
      }))
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  const deleteColumn = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('board_columns').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (d) => ({
        ...d,
        columns: d.columns.filter((c) => c.id !== id),
        cards: d.cards.filter((c) => c.columnId !== id),
      }))
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  // ─── Cards ─────────────────────────────────────────────────────────────
  const createCard = useMutation({
    mutationFn: async ({
      columnId,
      title,
      content,
      color,
    }: {
      columnId: string
      title: string
      content?: string | null
      color?: string | null
    }) => {
      if (!data) throw new Error('Quadro não carregado.')
      const userId = await requireUserId()
      const position = data.cards.filter((c) => c.columnId === columnId).length
      const { error } = await supabase.from('cards').insert({
        user_id: userId,
        column_id: columnId,
        title,
        content: content ?? null,
        color: color ?? null,
        position,
      })
      if (error) throw error
    },
    onSettled: settle,
  })

  const updateCard = useMutation({
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
      const prev = patchCache(qc, (d) => ({
        ...d,
        cards: d.cards.map((c) => (c.id === id ? { ...c, ...patch } : c)),
      }))
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  const deleteCard = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('cards').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (d) => ({
        ...d,
        cards: d.cards.filter((c) => c.id !== id),
      }))
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  // ─── Mover card (entre colunas + reordenar) — persiste só ao soltar ──────
  const moveCard = useMutation({
    mutationFn: async ({
      cardId,
      fromColumnId,
      toColumnId,
    }: {
      cardId: string
      fromColumnId: string
      toColumnId: string
      toIndex: number
    }) => {
      // o cache já foi reordenado no onMutate: persiste as posições/coluna de
      // todos os cards das colunas afetadas.
      const current = qc.getQueryData<BoardData>(KEY)
      if (!current) return
      const cols = new Set([fromColumnId, toColumnId])
      const affected = current.cards.filter(
        (c) => cols.has(c.columnId) || c.id === cardId,
      )
      const results = await Promise.all(
        affected.map((c) =>
          supabase
            .from('cards')
            .update({ column_id: c.columnId, position: c.position })
            .eq('id', c.id),
        ),
      )
      const failed = results.find((r) => r.error)
      if (failed?.error) throw failed.error
    },
    onMutate: async (vars) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (d) => ({
        ...d,
        cards: computeMove(
          d.cards,
          vars.cardId,
          vars.fromColumnId,
          vars.toColumnId,
          vars.toIndex,
        ),
      }))
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  return {
    boardId: data?.boardId ?? null,
    columns: data?.columns ?? EMPTY_COLUMNS,
    cards: data?.cards ?? EMPTY_CARDS,
    isLoading: query.isLoading,
    error: query.error,
    createColumn: createColumn.mutate,
    renameColumn: renameColumn.mutate,
    deleteColumn: deleteColumn.mutate,
    createCard: createCard.mutate,
    updateCard: updateCard.mutate,
    deleteCard: deleteCard.mutate,
    moveCard: moveCard.mutate,
  }
}
