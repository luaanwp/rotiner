/**
 * Tarefas (§05 RF-03, §06) via React Query. Componente NUNCA fala com o
 * Supabase direto — passa por aqui. Todas as mutations são OTIMISTAS: a UI
 * muda na hora e reverte se o servidor recusar.
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { addDaysKey, createId, dateKey } from '@/lib/dates'
import { PRIORITY_ORDER } from '@/lib/domainMeta'
import type { Priority, Task } from '@/types/models'

const KEY = ['tasks'] as const

// ─── Mapeamento snake_case (banco) ↔ camelCase (domínio) ────────────────────
interface TaskRow {
  id: string
  user_id: string
  title: string
  date: string | null
  time: string | null
  priority: Priority
  completed: boolean
  project_id: string | null
  created_at: string
  updated_at: string
}

function rowToTask(r: TaskRow): Task {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    date: r.date,
    time: r.time,
    priority: r.priority,
    completed: r.completed,
    projectId: r.project_id,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export interface TaskInput {
  title: string
  date?: string | null
  time?: string | null
  priority?: Priority
  projectId?: string | null
}

// ─── Ordenação estável para a UI ────────────────────────────────────────────
function sortTasks(a: Task, b: Task): number {
  const da = a.date ?? '9999-12-31'
  const db = b.date ?? '9999-12-31'
  if (da !== db) return da < db ? -1 : 1
  const ta = a.time ?? '99:99'
  const tb = b.time ?? '99:99'
  if (ta !== tb) return ta < tb ? -1 : 1
  return PRIORITY_ORDER.indexOf(a.priority) - PRIORITY_ORDER.indexOf(b.priority)
}

// ─── Query ──────────────────────────────────────────────────────────────────
export function useTasksQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Task[]> => {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .order('date', { ascending: true, nullsFirst: false })
      if (error) throw error
      return (data as TaskRow[]).map(rowToTask).sort(sortTasks)
    },
  })
}

// ─── Helpers de update otimista ─────────────────────────────────────────────
function patchCache(qc: QueryClient, fn: (prev: Task[]) => Task[]) {
  const prev = qc.getQueryData<Task[]>(KEY) ?? []
  qc.setQueryData<Task[]>(KEY, fn([...prev]).sort(sortTasks))
  return prev
}

/**
 * Hook único de tarefas: a query + todas as mutations com rollback.
 * Uso: `const { tasks, isLoading, createTask, toggleTask, ... } = useTasks()`.
 */
export function useTasks() {
  const qc = useQueryClient()
  const query = useTasksQuery()

  const rollback = (_e: unknown, _v: unknown, ctx: { prev: Task[] } | undefined) => {
    if (ctx) qc.setQueryData(KEY, ctx.prev)
  }
  const settle = () => {
    void qc.invalidateQueries({ queryKey: KEY })
  }

  const createTask = useMutation({
    mutationFn: async (input: TaskInput) => {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (!userId) throw new Error('Sem sessão.')
      const { error } = await supabase.from('tasks').insert({
        user_id: userId,
        title: input.title,
        date: input.date ?? null,
        time: input.time ?? null,
        priority: input.priority ?? 'media',
        project_id: input.projectId ?? null,
      })
      if (error) throw error
    },
    onMutate: async (input) => {
      await qc.cancelQueries({ queryKey: KEY })
      const optimistic: Task = {
        id: createId(),
        userId: 'optimistic',
        title: input.title,
        date: input.date ?? null,
        time: input.time ?? null,
        priority: input.priority ?? 'media',
        completed: false,
        projectId: input.projectId ?? null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      }
      const prev = patchCache(qc, (list) => [...list, optimistic])
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  const updateTask = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<TaskInput> }) => {
      const row: Record<string, unknown> = {}
      if (patch.title !== undefined) row.title = patch.title
      if (patch.date !== undefined) row.date = patch.date
      if (patch.time !== undefined) row.time = patch.time
      if (patch.priority !== undefined) row.priority = patch.priority
      if (patch.projectId !== undefined) row.project_id = patch.projectId
      const { error } = await supabase.from('tasks').update(row).eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (list) =>
        list.map((t) => (t.id === id ? { ...t, ...patch } : t)),
      )
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  const toggleTask = useMutation({
    mutationFn: async ({ id, completed }: { id: string; completed: boolean }) => {
      const { error } = await supabase
        .from('tasks')
        .update({ completed })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, completed }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (list) =>
        list.map((t) => (t.id === id ? { ...t, completed } : t)),
      )
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('tasks').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (list) => list.filter((t) => t.id !== id))
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  // Recebe a data ATUAL da tarefa por parâmetro (não lê do cache, que o
  // onMutate já teria mutado — senão a data incrementa duas vezes).
  const snoozeTask = useMutation({
    mutationFn: async ({ id, date }: { id: string; date: string | null }) => {
      const next = addDaysKey(date ?? dateKey(), 1)
      const { error } = await supabase
        .from('tasks')
        .update({ date: next })
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, date }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const next = addDaysKey(date ?? dateKey(), 1)
      const prev = patchCache(qc, (list) =>
        list.map((t) => (t.id === id ? { ...t, date: next } : t)),
      )
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  return {
    tasks: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createTask: createTask.mutate,
    updateTask: updateTask.mutate,
    toggleTask: toggleTask.mutate,
    deleteTask: deleteTask.mutate,
    snoozeTask: snoozeTask.mutate,
  }
}
