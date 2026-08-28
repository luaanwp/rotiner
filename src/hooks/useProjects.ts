/**
 * Projetos (§05 RF-08, §06) via React Query. Componente NUNCA fala com o
 * Supabase direto. Mutations OTIMISTAS com rollback. `createProject` é async e
 * devolve o projeto persistido (o ProjectsView abre o drawer com o id real).
 */
import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
} from '@tanstack/react-query'
import { supabase } from '@/lib/supabase'
import { STATUS_ORDER } from '@/lib/domainMeta'
import type { Project, ProjectStatus } from '@/types/models'

const KEY = ['projects'] as const

interface ProjectRow {
  id: string
  user_id: string
  title: string
  description: string | null
  status: ProjectStatus
  progress: number
  where_stopped: string | null
  next_step: string | null
  created_at: string
  updated_at: string
}

function rowToProject(r: ProjectRow): Project {
  return {
    id: r.id,
    userId: r.user_id,
    title: r.title,
    description: r.description,
    status: r.status,
    progress: r.progress,
    whereStopped: r.where_stopped,
    nextStep: r.next_step,
    createdAt: r.created_at,
    updatedAt: r.updated_at,
  }
}

export interface ProjectInput {
  title: string
  description?: string | null
  status?: ProjectStatus
  progress?: number
  whereStopped?: string | null
  nextStep?: string | null
}

function sortProjects(a: Project, b: Project): number {
  const sa = STATUS_ORDER.indexOf(a.status)
  const sb = STATUS_ORDER.indexOf(b.status)
  if (sa !== sb) return sa - sb
  return a.createdAt < b.createdAt ? 1 : -1 // mais novo primeiro dentro do status
}

export function useProjectsQuery() {
  return useQuery({
    queryKey: KEY,
    queryFn: async (): Promise<Project[]> => {
      const { data, error } = await supabase.from('projects').select('*')
      if (error) throw error
      return (data as ProjectRow[]).map(rowToProject).sort(sortProjects)
    },
  })
}

function patchCache(qc: QueryClient, fn: (prev: Project[]) => Project[]) {
  const prev = qc.getQueryData<Project[]>(KEY) ?? []
  qc.setQueryData<Project[]>(KEY, fn([...prev]).sort(sortProjects))
  return prev
}

// mapeia patch camelCase → colunas snake_case
function patchToRow(patch: Partial<ProjectInput>): Record<string, unknown> {
  const row: Record<string, unknown> = {}
  if (patch.title !== undefined) row.title = patch.title
  if (patch.description !== undefined) row.description = patch.description
  if (patch.status !== undefined) row.status = patch.status
  if (patch.progress !== undefined) row.progress = patch.progress
  if (patch.whereStopped !== undefined) row.where_stopped = patch.whereStopped
  if (patch.nextStep !== undefined) row.next_step = patch.nextStep
  return row
}

export function useProjects() {
  const qc = useQueryClient()
  const query = useProjectsQuery()

  const rollback = (
    _e: unknown,
    _v: unknown,
    ctx: { prev: Project[] } | undefined,
  ) => {
    if (ctx) qc.setQueryData(KEY, ctx.prev)
  }
  const settle = () => {
    void qc.invalidateQueries({ queryKey: KEY })
  }

  const createProject = useMutation({
    mutationFn: async (input: ProjectInput): Promise<Project> => {
      const { data: auth } = await supabase.auth.getUser()
      const userId = auth.user?.id
      if (!userId) throw new Error('Sem sessão.')
      const { data, error } = await supabase
        .from('projects')
        .insert({
          user_id: userId,
          title: input.title,
          description: input.description ?? null,
          status: input.status ?? 'andamento',
          progress: input.progress ?? 0,
          where_stopped: input.whereStopped ?? null,
          next_step: input.nextStep ?? null,
        })
        .select()
        .single()
      if (error) throw error
      return rowToProject(data as ProjectRow)
    },
    // insere no cache na hora pra o drawer achar o projeto sem esperar refetch
    onSuccess: (project) => {
      patchCache(qc, (list) =>
        list.some((p) => p.id === project.id) ? list : [...list, project],
      )
    },
    onSettled: settle,
  })

  const updateProject = useMutation({
    mutationFn: async ({
      id,
      patch,
    }: {
      id: string
      patch: Partial<ProjectInput>
    }) => {
      const { error } = await supabase
        .from('projects')
        .update(patchToRow(patch))
        .eq('id', id)
      if (error) throw error
    },
    onMutate: async ({ id, patch }) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (list) =>
        list.map((p) => (p.id === id ? { ...p, ...patch } : p)),
      )
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  const deleteProject = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('projects').delete().eq('id', id)
      if (error) throw error
    },
    onMutate: async (id) => {
      await qc.cancelQueries({ queryKey: KEY })
      const prev = patchCache(qc, (list) => list.filter((p) => p.id !== id))
      return { prev }
    },
    onError: rollback,
    onSettled: settle,
  })

  return {
    projects: query.data ?? [],
    isLoading: query.isLoading,
    error: query.error,
    createProject: createProject.mutateAsync,
    updateProject: updateProject.mutate,
    deleteProject: deleteProject.mutate,
  }
}
