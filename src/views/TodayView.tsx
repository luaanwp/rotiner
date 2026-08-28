/**
 * View Hoje (§05 RF-04) — saudação por horário; seções Hoje / Pendentes /
 * Concluídas com contadores; cada tarefa com concluir, editar, adiar e excluir.
 */
import { useMemo } from 'react'
import { Check, Clock, Pencil, Trash2 } from 'lucide-react'
import { useTasks } from '@/hooks/useTasks'
import { useComposer } from '@/stores/useComposer'
import { useConfirm } from '@/stores/useConfirm'
import { useUiStore } from '@/stores/useUiStore'
import { dateKey, formatDate } from '@/lib/dates'
import { PRIORITY_META } from '@/lib/domainMeta'
import { cn } from '@/lib/cn'
import type { Task } from '@/types/models'

function greeting(): string {
  const h = new Date().getHours()
  if (h < 12) return 'Bom dia'
  if (h < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default function TodayView() {
  const { tasks, isLoading, toggleTask, deleteTask, snoozeTask } = useTasks()
  const openEditTask = useComposer((s) => s.openEditTask)
  const openNewTask = useComposer((s) => s.openNewTask)
  const confirm = useConfirm((s) => s.confirm)
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
        </>
      )}
    </div>
  )
}
