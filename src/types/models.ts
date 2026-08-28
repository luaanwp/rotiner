/**
 * Modelos de domínio (§06) — camelCase no TS, espelhando as tabelas do
 * banco (snake_case). O mapeamento snake↔camel vive nos hooks (React Query).
 *
 * Toda entidade carrega: id, userId, createdAt, updatedAt.
 */

export type Priority = 'alta' | 'media' | 'baixa'
export type ProjectStatus = 'andamento' | 'pausado' | 'ideia' | 'concluido'
export type Cadence = 'diaria' | 'semanal' | 'mensal'

/** Campos comuns a todas as entidades. */
interface Base {
  id: string
  userId: string
  createdAt: string
  updatedAt: string
}

export interface Task extends Base {
  title: string
  /** YYYY-MM-DD local; null = sem data */
  date: string | null
  /** "HH:mm"; null = sem hora */
  time: string | null
  priority: Priority
  completed: boolean
  /** vínculo opcional com um projeto */
  projectId: string | null
}

export interface Note extends Base {
  title: string | null
  content: string | null
  pinned: boolean
  /** solta (null) / com data / com data+hora */
  date: string | null
  time: string | null
}

export interface Project extends Base {
  title: string
  description: string | null
  status: ProjectStatus
  /** 0..100 */
  progress: number
  whereStopped: string | null
  nextStep: string | null
}

export interface Routine extends Base {
  title: string
  cadence: Cadence
  /** dias da semana (0=Dom … 6=Sáb); só relevante quando cadence = 'semanal' */
  weekdays: number[]
  /** "HH:mm"; null = sem hora */
  time: string | null
  active: boolean
  /** YYYY-MM-DD do último "feito"; null = nunca */
  lastDone: string | null
}

export interface Board extends Base {
  title: string
}

export interface BoardColumn extends Base {
  boardId: string
  title: string
  position: number
}

export interface Card extends Base {
  columnId: string
  title: string
  content: string | null
  color: string | null
  /** posição no canvas livre (Fase 8); null enquanto vive só na coluna */
  posX: number | null
  posY: number | null
  /** ordem dentro da coluna */
  position: number
}
