/**
 * ProjectDrawer (§05 RF-08) — painel lateral do projeto. Edita título,
 * descrição, status, progresso, "onde parei" e "próximo passo" (autosave via
 * useProjects, otimista). Lista as tarefas vinculadas (useTasks por projectId)
 * e permite criar uma já vinculada. Excluir pede confirmação. Fecha com Escape
 * / clique fora — a mecânica de blur do canvas vem na Fase 8.
 */
import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { Check, Plus, Trash2, X } from 'lucide-react'
import { useProjects, type ProjectInput } from '@/hooks/useProjects'
import { useTasks } from '@/hooks/useTasks'
import { useProjectDrawer } from '@/stores/useProjectDrawer'
import { useComposer } from '@/stores/useComposer'
import { useConfirm } from '@/stores/useConfirm'
import { STATUS_META, STATUS_ORDER } from '@/lib/domainMeta'
import { cn } from '@/lib/cn'
import type { ProjectStatus } from '@/types/models'

export function ProjectDrawer() {
  const projectId = useProjectDrawer((s) => s.projectId)
  const close = useProjectDrawer((s) => s.close)
  const { projects, updateProject, deleteProject } = useProjects()
  const { tasks, toggleTask } = useTasks()
  const openNewTask = useComposer((s) => s.openNewTask)
  const confirm = useConfirm((s) => s.confirm)

  const project = projects.find((p) => p.id === projectId) ?? null

  // form local (semeado quando abre um projeto)
  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<ProjectStatus>('andamento')
  const [progress, setProgress] = useState(0)
  const [whereStopped, setWhereStopped] = useState('')
  const [nextStep, setNextStep] = useState('')

  // Semeia o form UMA vez por projeto — quando ele fica disponível (o projeto
  // recém-criado pode chegar no cache um tick depois de abrir o drawer). Não
  // re-semeia em updates otimistas seguintes (senão clobbaria o que se digita).
  const seededFor = useRef<string | null>(null)
  useEffect(() => {
    if (!projectId) {
      seededFor.current = null
      return
    }
    if (!project || seededFor.current === project.id) return
    seededFor.current = project.id
    setTitle(project.title)
    setDescription(project.description ?? '')
    setStatus(project.status)
    setProgress(project.progress)
    setWhereStopped(project.whereStopped ?? '')
    setNextStep(project.nextStep ?? '')
  }, [projectId, project])

  useEffect(() => {
    if (!projectId) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [projectId, close])

  if (!projectId || !project) return null
  const id = project.id

  const save = (patch: Partial<ProjectInput>) => updateProject({ id, patch })

  const linked = tasks.filter((t) => t.projectId === id)

  async function handleDelete() {
    const ok = await confirm({
      title: 'Excluir projeto?',
      message: `"${project!.title}" será removido. As tarefas vinculadas ficam sem projeto.`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (ok) {
      deleteProject(id)
      close()
    }
  }

  return createPortal(
    <div className="fixed inset-0 z-50">
      <div
        className="absolute inset-0 bg-black/60 animate-[fade_.15s_ease-out]"
        onClick={close}
        aria-hidden
      />
      <aside
        role="dialog"
        aria-modal="true"
        aria-label={`Projeto ${project.title}`}
        className="absolute inset-y-0 right-0 flex w-full max-w-md flex-col bg-painel shadow-2xl ring-1 ring-white/10"
      >
        <header className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            onBlur={() => title.trim() && title !== project.title && save({ title: title.trim() })}
            aria-label="Título do projeto"
            className="min-w-0 flex-1 bg-transparent text-lg font-bold text-tinta focus:outline-none"
          />
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={handleDelete}
              aria-label="Excluir projeto"
              className="rounded-lg p-1.5 text-tinta/50 hover:bg-white/5 hover:text-alta"
            >
              <Trash2 size={18} />
            </button>
            <button
              type="button"
              onClick={close}
              aria-label="Fechar"
              className="rounded-lg p-1.5 text-tinta/50 hover:bg-white/5 hover:text-tinta"
            >
              <X size={18} />
            </button>
          </div>
        </header>

        <div className="min-h-0 flex-1 space-y-5 overflow-auto p-4">
          {/* Status */}
          <div>
            <span className="text-xs text-tinta/60">Status</span>
            <div className="mt-1 grid grid-cols-2 gap-2">
              {STATUS_ORDER.map((s) => {
                const meta = STATUS_META[s]
                const active = status === s
                return (
                  <button
                    key={s}
                    type="button"
                    onClick={() => {
                      setStatus(s)
                      save({ status: s })
                    }}
                    className={cn(
                      'flex items-center justify-center gap-1.5 rounded-lg border py-2 text-sm transition-colors',
                      active
                        ? 'border-roxo-claro bg-white/5 text-tinta'
                        : 'border-white/10 text-tinta/60 hover:bg-white/5',
                    )}
                  >
                    <span className={cn('h-2 w-2 rounded-full', meta.dot)} />
                    {meta.label}
                  </button>
                )
              })}
            </div>
          </div>

          {/* Progresso */}
          <div>
            <div className="mb-1 flex items-center justify-between text-xs text-tinta/60">
              <span>Progresso</span>
              <span className="tabular-nums text-tinta">{progress}%</span>
            </div>
            <input
              type="range"
              min={0}
              max={100}
              value={progress}
              onChange={(e) => setProgress(Number(e.target.value))}
              onPointerUp={() => save({ progress })}
              onKeyUp={() => save({ progress })}
              aria-label="Progresso do projeto"
              className="w-full accent-roxo"
            />
          </div>

          {/* Descrição */}
          <label className="block text-xs text-tinta/60">
            Descrição
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              onBlur={() => save({ description: description.trim() || null })}
              rows={2}
              placeholder="Do que se trata…"
              className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-tinta placeholder:text-tinta/40 focus-visible:border-roxo-claro focus-visible:outline-none"
            />
          </label>

          {/* Onde parei */}
          <label className="block text-xs text-tinta/60">
            Onde parei
            <textarea
              value={whereStopped}
              onChange={(e) => setWhereStopped(e.target.value)}
              onBlur={() => save({ whereStopped: whereStopped.trim() || null })}
              rows={2}
              placeholder="O último ponto em que você estava…"
              className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-tinta placeholder:text-tinta/40 focus-visible:border-roxo-claro focus-visible:outline-none"
            />
          </label>

          {/* Próximo passo */}
          <label className="block text-xs text-tinta/60">
            Próximo passo
            <textarea
              value={nextStep}
              onChange={(e) => setNextStep(e.target.value)}
              onBlur={() => save({ nextStep: nextStep.trim() || null })}
              rows={2}
              placeholder="A próxima ação concreta…"
              className="mt-1 w-full resize-y rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-sm text-tinta placeholder:text-tinta/40 focus-visible:border-roxo-claro focus-visible:outline-none"
            />
          </label>

          {/* Tarefas vinculadas */}
          <div>
            <div className="mb-2 flex items-center justify-between">
              <span className="text-xs text-tinta/60">
                Tarefas vinculadas
                <span className="ml-1.5 tabular-nums text-tinta/40">{linked.length}</span>
              </span>
              <button
                type="button"
                onClick={() => openNewTask({ projectId: id })}
                className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-roxo-claro hover:bg-white/5"
              >
                <Plus size={13} /> tarefa
              </button>
            </div>
            {linked.length === 0 ? (
              <p className="text-xs text-tinta/30">Nenhuma tarefa vinculada ainda.</p>
            ) : (
              <ul className="space-y-1">
                {linked.map((t) => (
                  <li
                    key={t.id}
                    className="flex items-center gap-2 rounded-lg border border-white/5 bg-white/[.03] px-2.5 py-1.5"
                  >
                    <button
                      type="button"
                      onClick={() => toggleTask({ id: t.id, completed: !t.completed })}
                      aria-label={t.completed ? 'Desmarcar' : 'Concluir'}
                      className={cn(
                        'flex h-4 w-4 shrink-0 items-center justify-center rounded border transition-colors',
                        t.completed
                          ? 'border-concluido bg-concluido text-bg'
                          : 'border-white/25 hover:border-roxo-claro',
                      )}
                    >
                      {t.completed && <Check size={11} strokeWidth={3} />}
                    </button>
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate text-sm',
                        t.completed ? 'text-tinta/40 line-through' : 'text-tinta',
                      )}
                    >
                      {t.title}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>
      </aside>
    </div>,
    document.body,
  )
}
