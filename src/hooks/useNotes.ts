/**
 * Notas (§05 RF-05, §06) via React Query. Três tipos: solta (sem date),
 * com data, ou com data+hora. Componente NUNCA fala com o Supabase direto.
 * Mutations OTIMISTAS: UI muda na hora e reverte se o servidor recusar.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { createId } from '@/lib/dates'
import type { Note } from '@/types/models'

const KEY = ['notes'] as const

// ─── Mapeamento snake_case (banco) ↔ camelCase (domínio) ────────────────────
interface NoteRow {
  id: string
  user_id: string
  title: string | null
  content: string | null
  pinned: boolean
  date: string | null
  time: string | null
  created_at: string
  updated_at: string
}

function rowToNote(r: NoteRow): Note {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    content: r.content,
    pinned: r.pinned,
    date: r.date,
    time: r.time,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export interface NoteInput {
  title?: string | null
  content?: string | null
  pinned?: boolean
  date?: string | null
  time?: string | null
}

// ─── Ordenação estável para a UI (data, hora, criação) ──────────────────────
function sortNotes(a: Note, b: Note): number {
  const da = a.date ?? '9999-12-31'
  const db = b.date ?? '9999-12-31'
  if (da !== db) return da < db ? -1 : 1
  const ta = a.time ?? '99:99'
  const tb = b.time ?? '99:99'
  if (ta !== tb) return ta < tb ? -1 : 1
  return a.createdAt < b.createdAt ? -1 : 1
}

// ─── Query ──────────────────────────────────────────────────────────────────
export function useNotesQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Note[]> => {
      const { data, error } = await supabase.from('notes').select('*')
      if (error) throw error
      return (data as NoteRow[]).map(rowToNote).sort(sortNotes)
    },
  })
}

// ─── Helper de update otimista ──────────────────────────────────────────────
function patchCache(qc: QueryClient, fn: (prev: Note[]) => Note[]) {
  const prev = qc.getQueryData<Note[]>(KEY) ?? []
  qc.setQueryData<Note[]>(KEY, fn([...prev]).sort(sortNotes))
  return prev
}

/**
 * Hook único de notas: a query + todas as mutations com rollback.
 * Uso: `const { notes, isLoading, createNote, updateNote, deleteNote } = useNotes()`.
 */
export function useNotes() {
  const qc = useQueryClient()
  const query = useNotesQuery()

  const rollback = (_e: unknown, _v: unknown, ctx: { prev: Note[] } | undefined) => {
    if (ctx) qc.setQueryData(KEY, ctx.prev)
  }
  const settle = () => {
    void qc.invalidateQueries({ queryKey: KEY })
  }

  const createNote = useMutation({
    mutationFn: async (input: NoteInput) => {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (!userId) throw new Error('Sem sessão.')
      const { error } = await supabase.from('notes').insert({
        user_id: userId,
        title: input.title ?? null,
        content: input.content ?? null,
        pinned: input.pinned ?? false,
        date: input.date ?? null,
        time: input.time ?? null,
      })
      if (error) throw error
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: KEY })
      const now = new Date().toISOString()
      const optimistic: Note = {
        id: createId(),
        userId: 'optimistic',
        title: input.title ?? null,
        content: input.content ?? null,
        pinned: input.pinned ?? false,
        date: input.date ?? null,
        time: input.time ?? null,
        createdAt: now,
        updatedAt: now,
      }
      const prev = patchCache(qc, (list) => [...list, optimistic])
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  const updateNote = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<NoteInput> }) => {
      const row: Record<string, unknown> = {}
      if (patch.title !== undefined) row.title = patch.title
      if (patch.content !== undefined) row.content = patch.content
      if (patch.pinned !== undefined) row.pinned = patch.pinned
      if (patch.date !== undefined) row.date = patch.date
      if (patch.time !== undefined) row.time = patch.time
      const { error } = await supabase.from('notes').update(row).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (list) =>
        list.map((n) => (n.id === id ? { ...n, ...patch } : n)),
      )
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  const deleteNote = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('notes').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (list) => list.filter((n) => n.id !== id))
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  return {
    notes: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createNote: createNote.mutate,
    updateNote: updateNote.mutate,
    deleteNote: deleteNote.mutate,
  }
}
