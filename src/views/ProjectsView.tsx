/**
 * Projetos (§05 RF-08) — grade de cards com status colorido e barra de
 * progresso. Clicar num card abre o ProjectDrawer. "+ Novo projeto" cria e já
 * abre o drawer pra editar.
 */
import { Plus } from 'lucide-react'
import { useProjects } from '@/hooks/useProjects'
import { useProjectDrawer } from '@/stores/useProjectDrawer'
import { useUiStore } from '@/stores/useUiStore'
import { STATUS_META } from '@/lib/domainMeta'
import { cn } from '@/lib/cn'
import type { Project } from '@/types/models'

export default function ProjectsView() {
  const { projects, isLoading, createProject } = useProjects()
  const openDrawer = useProjectDrawer((s) => s.open)
  const search = useUiStore((s) => s.search).toLowerCase().trim()

  const filtered = search
    ? projects.filter(
        (p) =>
          p.title.toLowerCase().includes(search) ||
          (p.description ?? '').toLowerCase().includes(search),
      )
    : projects

  async function handleNew() {
    const p = await createProject({ title: 'Novo projeto' })
    openDrawer(p.id)
  }

  return (
    <div className="pointer-events-auto mx-auto max-w-4xl px-4 py-6 md:px-8">
      <header className="mb-5 flex items-center justify-between">
        <h1 className="text-2xl font-black text-tinta">Projetos</h1>
        <button
          type="button"
          onClick={handleNew}
          className="flex items-center gap-1.5 rounded-lg bg-roxo px-3 py-2 text-sm font-semibold text-white hover:bg-roxo/90"
        >
          <Plus size={16} /> Novo projeto
        </button>
      </header>

      {isLoading ? (
        <p className="text-sm text-tinta/40">Carregando…</p>
      ) : filtered.length === 0 ? (
        <button
          type="button"
          onClick={handleNew}
          className="w-full rounded-xl border border-dashed border-white/15 py-12 text-sm text-tinta/40 hover:border-roxo-claro hover:text-tinta/70"
        >
          Nenhum projeto ainda. Toque pra criar o primeiro.
        </button>
      ) : (
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((p) => (
            <ProjectCard key={p.id} project={p} onClick={() => openDrawer(p.id)} />
          ))}
        </div>
      )}
    </div>
  )
}

function ProjectCard({
  project,
  onClick,
}: {
  project: Project
  onClick: () => void
}) {
  const meta = STATUS_META[project.status]
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex flex-col gap-3 rounded-xl border border-white/10 bg-white/[.03] p-4 text-left transition-colors hover:border-roxo-claro/40 hover:bg-white/5"
    >
      <div className="flex items-start justify-between gap-2">
        <h2 className="min-w-0 flex-1 truncate font-semibold text-tinta">
          {project.title}
        </h2>
        <span
          className={cn(
            'flex shrink-0 items-center gap-1.5 rounded-full bg-black/20 px-2 py-0.5 text-xs',
            meta.text,
          )}
        >
          <span className={cn('h-1.5 w-1.5 rounded-full', meta.dot)} />
          {meta.label}
        </span>
      </div>

      {project.description && (
        <p className="line-clamp-2 text-sm text-tinta/50">{project.description}</p>
      )}

      <div className="mt-auto">
        <div className="mb-1 flex items-center justify-between text-xs text-tinta/50 tabular-nums">
          <span>Progresso</span>
          <span>{project.progress}%</span>
        </div>
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <div
            className={cn('h-full rounded-full transition-all', meta.bar)}
            style={{ width: `${project.progress}%` }}
          />
        </div>
      </div>
    </button>
  )
}
