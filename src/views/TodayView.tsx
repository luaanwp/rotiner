/**
 * View Hoje (§05 RF-04) — a tela inicial funciona como PAINEL: saudação,
 * tarefas do dia (Hoje / Pendentes / Concluídas) e uma AMOSTRA da situação
 * de projetos e notas. As amostras são só um lembrete rápido — clicar leva
 * à página cheia (Projetos / Calendário) pra editar de fato.
 */
import { useMemo } from 'react'
import {
  Check,
  ChevronRight,
  Clock,
  Pencil,
  Pin,
  StickyNote,
  Trash2,
} from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { useProjects } from '@/hooks/useProjects'
import { useNotes } from '@/hooks/useNotes'
import { useComposer } from '@/stores/useComposer'
import { useConfirm } from '@/stores/useConfirm'
import { useUiStore, type ViewId } from '@/stores/useUiStore'
import { dateKey, formatDate } from '@/lib/dates'
import { PRIORITY_META, STATUS_META } from '@/lib/domainMeta'
import { cn } from '@/lib/cn'
import type { Note, Project, Task } from '@/types/models'

/** Quantos itens de amostra mostrar na tela inicial. */
const PROJECT_SAMPLE = 3
const NOTE_SAMPLE = 5

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function TodayView() {
  const { tasks, isLoading, toggleTask, deleteTask, snoozeTask } = useTasks()
  const { projects } = useProjects()
  const { notes } = useNotes()
  const openEditTask = useComposer((s) => s.openEditTask)
  const openNewTask = useComposer((s) => s.openNewTask)
  const confirm = useConfirm((s) => s.confirm)
  const setView = useUiStore((s) => s.setView)
  const search = useUiStore((s) => s.search).toLowerCase().trim()

  const today = dateKey()

  const { hoje, pendentes, concluidas } = useMemo(() => {
    const filtered = search
      ? tasks.filter((t) => t.title.toLowerCase().includes(search))
      : tasks
    return {
      hoje: filtered.filter(
        (t) => !t.completed && (t.date === today || t.date === null),
      ),
      pendentes: filtered.filter(
        (t) => !t.completed && t.date !== null && t.date < today,
      ),
      concluidas: filtered.filter(
        (t) => t.completed && (t.date === today || t.date === null),
      ),
    }
  }, [tasks, search, today])

  // Amostra de projetos: já vêm ordenados (andamento→…→concluído, mais novo 1º).
  const projectSample = useMemo(
    () => projects.slice(0, PROJECT_SAMPLE),
    [projects],
  )

  // Amostra de notas: fixadas primeiro, depois as mais recentes.
  const noteSample = useMemo(() => {
    const byNew = (a: Note, b: Note) => (a.createdAt < b.createdAt ? 1 : -1)
    const pinned = notes.filter((n) => n.pinned).sort(byNew)
    const rest = notes.filter((n) => !n.pinned).sort(byNew)
    return [...pinned, ...rest].slice(0, NOTE_SAMPLE)
  }, [notes])

  async function handleDelete(task: Task) {
    const ok = await confirm({
      title: 'Excluir tarefa?',
      message: `"${task.title}" será removida.`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (ok) deleteTask(task.id)
  }

  const TaskItem = ({ task }: { task: Task }) => {
    const meta = PRIORITY_META[task.priority]
    return (
      <li className="group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[.03] px-3 py-2.5">
        <button
          type="button"
          onClick={() => toggleTask({ id: task.id, completed: !task.completed })}
          aria-label={task.completed ? 'Desmarcar' : 'Concluir'}
          aria-pressed={task.completed}
          className={cn(
            'flex h-5 w-5 shrink-0 items-center justify-center rounded-md border transition-colors',
            task.completed
              ? 'border-concluido bg-concluido text-bg'
              : 'border-white/25 hover:border-roxo-claro',
          )}
        >
          {task.completed && <Check size={14} strokeWidth={3} />}
        </button>

        <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} title={meta.label} />

        <span
          className={cn(
            'min-w-0 flex-1 truncate text-sm',
            task.completed ? 'text-tinta/40 line-through' : 'text-tinta',
          )}
        >
          {task.title}
        </span>

        {task.time && (
          <span className="shrink-0 text-xs text-tinta/50 tabular-nums">
            {task.time}
          </span>
        )}
        {task.date && task.date !== today && (
          <span className="shrink-0 text-xs text-tinta/40">
            {formatDate(task.date)}
          </span>
        )}

        <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
          {!task.completed && (
            <button
              type="button"
              onClick={() => snoozeTask({ id: task.id, date: task.date })}
              aria-label="Adiar para amanhã"
              title="Adiar para amanhã"
              className="rounded-md p-1.5 text-tinta/50 hover:bg-white/5 hover:text-tinta"
            >
              <Clock size={15} />
            </button>
          )}
          <button
            type="button"
            onClick={() => openEditTask(task)}
            aria-label="Editar"
            title="Editar"
            className="rounded-md p-1.5 text-tinta/50 hover:bg-white/5 hover:text-tinta"
          >
            <Pencil size={15} />
          </button>
          <button
            type="button"
            onClick={() => handleDelete(task)}
            aria-label="Excluir"
            title="Excluir"
            className="rounded-md p-1.5 text-tinta/50 hover:bg-white/5 hover:text-alta"
          >
            <Trash2 size={15} />
          </button>
        </div>
      </li>
    )
  }

  const Section = ({ label, items }: { label: string; items: Task[] }) => (
    <section className="mb-6">
      <h2 className="mb-2 flex items-center gap-2 text-sm font-semibold text-tinta/70">
        {label}
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-tinta/50 tabular-nums">
          {items.length}
        </span>
      </h2>
      {items.length === 0 ? (
        <p className="text-sm text-tinta/30">Nada aqui.</p>
      ) : (
        <ul className="space-y-1.5">
          {items.map((t) => (
            <TaskItem key={t.id} task={t} />
          ))}
        </ul>
      )}
    </section>
  )

  // Cabeçalho de amostra com "Ver todos/todas →" que troca de página.
  const OverviewHeader = ({
    label,
    total,
    to,
    seeAll,
  }: {
    label: string
    total: number
    to: ViewId
    seeAll: string
  }) => (
    <div className="mb-2 flex items-center justify-between">
      <h2 className="flex items-center gap-2 text-sm font-semibold text-tinta/70">
        {label}
        <span className="rounded-full bg-white/5 px-2 py-0.5 text-xs text-tinta/50 tabular-nums">
          {total}
        </span>
      </h2>
      <button
        type="button"
        onClick={() => setView(to)}
        className="flex items-center gap-0.5 text-xs text-roxo-claro transition hover:text-tinta"
      >
        {seeAll}
        <ChevronRight size={14} />
      </button>
    </div>
  )

  const ProjectCard = ({ project }: { project: Project }) => {
    const meta = STATUS_META[project.status]
    return (
      <button
        type="button"
        onClick={() => setView('projetos')}
        title="Abrir em Projetos"
        className="group flex w-full flex-col gap-2 rounded-xl border border-white/5 bg-white/[.03] px-3 py-2.5 text-left transition hover:border-roxo/40 hover:bg-white/[.05]"
      >
        <div className="flex items-center gap-2">
          <span className={cn('h-2 w-2 shrink-0 rounded-full', meta.dot)} />
          <span className="min-w-0 flex-1 truncate text-sm text-tinta">
            {project.title}
          </span>
          <span className={cn('shrink-0 text-xs', meta.text)}>{meta.label}</span>
          <span className="shrink-0 text-xs text-tinta/40 tabular-nums">
            {project.progress}%
          </span>
        </div>
        <div className="h-1.5 w-full overflow-hidden rounded-full bg-white/10">
          <div
            className={cn('h-full rounded-full transition-all', meta.bar)}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </button>
    )
  }

  const NoteCard = ({ note }: { note: Note }) => {
    const text = note.title?.trim() || note.content?.trim() || 'Sem título'
    return (
      <button
        type="button"
        onClick={() => setView('calendario')}
        title="Abrir em Calendário"
        className="group flex w-full items-center gap-3 rounded-xl border border-white/5 bg-white/[.03] px-3 py-2.5 text-left transition hover:border-roxo/40 hover:bg-white/[.05]"
      >
        {note.pinned ? (
          <Pin size={14} className="shrink-0 text-ambar" fill="currentColor" />
        ) : (
          <StickyNote size={14} className="shrink-0 text-tinta/40" />
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-tinta">{text}</span>
        {note.date && (
          <span className="shrink-0 text-xs text-tinta/40">
            {formatDate(note.date)}
            {note.time ? ` · ${note.time}` : ''}
          </span>
        )}
      </button>
    )
  }

  return (
    <div className="pointer-events-auto mx-auto max-w-2xl px-4 py-6 md:px-8">
      <header className="mb-6">
        <h1 className="text-2xl font-black text-tinta">{greeting()} 👋</h1>
        <p className="text-sm text-roxo-claro">
          {formatDate(today)} · {hoje.length} pra hoje
        </p>
      </header>

      {isLoading ? (
        <p className="text-sm text-tinta/40">Carregando…</p>
      ) : (
        <>
          {pendentes.length > 0 && <Section label="Pendentes" items={pendentes} />}
          <Section label="Hoje" items={hoje} />
          <Section label="Concluídas" items={concluidas} />
          {hoje.length === 0 && pendentes.length === 0 && concluidas.length === 0 && (
            <button
              type="button"
              onClick={() => openNewTask({ date: today })}
              className="w-full rounded-xl border border-dashed border-white/15 py-8 text-sm text-tinta/40 hover:border-roxo-claro hover:text-tinta/70"
            >
              Nenhuma tarefa ainda. Toque pra criar a primeira.
            </button>
          )}

          {/* Painéis de situação — só na tela inicial pura (sem busca ativa). */}
          {!search && (
            <>
              <section className="mb-6 mt-2">
                <OverviewHeader
                  label="Projetos"
                  total={projects.length}
                  to="projetos"
                  seeAll="Ver todos"
                />
                {projectSample.length === 0 ? (
                  <p className="text-sm text-tinta/30">Nenhum projeto ainda.</p>
                ) : (
                  <div className="space-y-1.5">
                    {projectSample.map((p) => (
                      <ProjectCard key={p.id} project={p} />
                    ))}
                  </div>
                )}
              </section>

              <section className="mb-6">
                <OverviewHeader
                  label="Notas"
                  total={notes.length}
                  to="calendario"
                  seeAll="Ver todas"
                />
                {noteSample.length === 0 ? (
                  <p className="text-sm text-tinta/30">Nenhuma nota ainda.</p>
                ) : (
                  <div className="space-y-1.5">
                    {noteSample.map((n) => (
                      <NoteCard key={n.id} note={n} />
                    ))}
                  </div>
                )}
              </section>
            </>
          )}
        </>
      )}
    </div>
  )
}
