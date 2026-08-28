/**
 * Rotinas recorrentes via React Query. Componente NUNCA fala com o Supabase
 * direto. Mutations OTIMISTAS com rollback.
 *
 * Resiliente à migration: se a tabela `routines` ainda não existe (migration
 * 002 não rodada), a query não estoura o app — expõe `tableMissing` pra view
 * mostrar um aviso de setup em vez de quebrar.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import type { Cadence, Routine } from '@/types/models'

const KEY = ['routines'] as const

interface RoutineRow {
  id: string
  user_id: string
  title: string
  cadence: Cadence
  weekdays: number[] | null
  time: string | null
  active: boolean
  last_done: string | null
  created_at: string
  updated_at: string
}

function rowToRoutine(r: RoutineRow): Routine {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    cadence: r.cadence,
    weekdays: r.weekdays ?? [],
    time: r.time,
    active: r.active,
    lastDone: r.last_done,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export interface RoutineInput {
  title: string
  cadence?: Cadence
  weekdays?: number[]
  time?: string | null
  active?: boolean
  lastDone?: string | null
}

/** Detecta "tabela não existe" (migration 002 pendente) pra não quebrar o app. */
export function isMissingTable(err: unknown): boolean {
  const e = err as { code?: string; message?: string } | null
  if (!e) return false
  return (
    e.code === '42P01' ||
    e.code === 'PGRST205' ||
    (typeof e.message === 'string' &&
      /routines/i.test(e.message) &&
      /(does not exist|schema cache)/i.test(e.message))
  )
}

function sortRoutines(a: Routine, b: Routine): number {
  if (a.active !== b.active) return a.active ? -1 : 1 // ativas primeiro
  return a.createdAt < b.createdAt ? 1 : -1 // mais nova primeiro
}

export function useRoutinesQuery() {
  return useQuery({
    queryKey: KEY,
    retry: false, // se a tabela não existe, não adianta repetir
    queryFn: async (): Promise<Routine[]> => {
      const { data, error } = await supabase.from('routines').select('*')
      if (error) throw error
      return (data as RoutineRow[]).map(rowToRoutine).sort(sortRoutines)
    },
  })
}

function patchCache(qc: QueryClient, fn: (prev: Routine[]) => Routine[]) {
  const prev = qc.getQueryData<Routine[]>(KEY) ?? []
  qc.setQueryData<Routine[]>(KEY, fn([...prev]).sort(sortRoutines))
  return prev
}

function patchToRow(patch: Partial<RoutineInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.cadence !== undefined) row.cadence = patch.cadence
  if (patch.weekdays !== undefined) row.weekdays = patch.weekdays
  if (patch.time !== undefined) row.time = patch.time
  if (patch.active !== undefined) row.active = patch.active
  if (patch.lastDone !== undefined) row.last_done = patch.lastDone
  return row
}

export function useRoutines() {
  const qc = useQueryClient()
  const query = useRoutinesQuery()

  const rollback = (
    _e: unknown,
    _v: unknown,
    ctx: { prev: Routine[] } | undefined,
  ) => {
    if (ctx) qc.setQueryData(KEY, ctx.prev)
  }
  const settle = () => {
    void qc.invalidateQueries({ queryKey: KEY })
  }

  const createRoutine = useMutation({
    mutationFn: async (input: RoutineInput): Promise<Routine> => {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (!userId) throw new Error('Sem sessão.')
      const { data, error } = await supabase
        .from('routines')
        .insert({
          user_id: userId,
          title: input.title,
          cadence: input.cadence ?? 'diaria',
          weekdays: input.weekdays ?? [],
          time: input.time ?? null,
          active: input.active ?? true,
          last_done: input.lastDone ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return rowToRoutine(data as RoutineRow)
    },
    onSuccess: (routine) => {
      patchCache(qc, (list) =>
        list.some((r) => r.id === routine.id) ? list : [...list, routine],
      )
    },
    onSettled: settle,
  })

  const updateRoutine = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<RoutineInput>
    }) => {
      const { error } = await supabase
        .from('routines')
        .update(patchToRow(patch))
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (list) =>
        list.map((r) => (r.id === id ? { ...r, ...patch } : r)),
      )
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  const deleteRoutine = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('routines').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (list) => list.filter((r) => r.id !== id))
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  return {
    routines: query.data ?? [],
    isLoading: query.isLoading,
    tableMissing: isMissingTable(query.error),
    createRoutine: createRoutine.mutateAsync,
    updateRoutine: updateRoutine.mutate,
    deleteRoutine: deleteRoutine.mutate,
  }
}
