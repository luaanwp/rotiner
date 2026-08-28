/**
 * View Rotinas — hábitos recorrentes (diária / semanal / mensal). Criar,
 * ativar/pausar, marcar "feito hoje" e excluir. É a peça que dá nome ao app.
 *
 * Se a migration 002 (tabela `routines`) ainda não rodou, mostra um aviso de
 * setup em vez de quebrar (ver useRoutines.tableMissing).
 */
import { useMemo, useState } from 'react'
import { Check, Pause, Play, Plus, Repeat, Trash2 } from 'lucide-react'
import { useRoutines, type RoutineInput } from '@/hooks/useRoutines'
import { useConfirm } from '@/stores/useConfirm'
import { useUiStore } from '@/stores/useUiStore'
import { dateKey } from '@/lib/dates'
import { cn } from '@/lib/cn'
import type { Cadence, Routine } from '@/types/models'

const CADENCE_LABEL: Record<Cadence, string> = {
  diaria: 'Diária',
  semanal: 'Semanal',
  mensal: 'Mensal',
}

// 0=Dom … 6=Sáb (Date.getDay)
const WEEKDAY_LABELS = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

export default function RotinasView() {
  const { routines, isLoading, tableMissing, createRoutine, updateRoutine, deleteRoutine } =
    useRoutines()
  const confirm = useConfirm((s) => s.confirm)
  const search = useUiStore((s) => s.search).toLowerCase().trim()

  const [title, setTitle] = useState('')
  const [cadence, setCadence] = useState<Cadence>('diaria')
  const [weekdays, setWeekdays] = useState<number[]>([])
  const [time, setTime] = useState('')
  const [saving, setSaving] = useState(false)

  const today = dateKey()

  const list = useMemo(
    () =>
      search
        ? routines.filter((r) => r.title.toLowerCase().includes(search))
        : routines,
    [routines, search],
  )

  function toggleWeekday(d: number) {
    setWeekdays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d].sort(),
    )
  }

  async function handleCreate() {
    if (!title.trim() || saving) return
    setSaving(true)
    const input: RoutineInput = {
      title: title.trim(),
      cadence,
      weekdays: cadence === 'semanal' ? weekdays : [],
      time: time || null,
    }
    try {
      await createRoutine(input)
      setTitle('')
      setCadence('diaria')
      setWeekdays([])
      setTime('')
    } finally {
      setSaving(false)
    }
  }

  async function handleDelete(r: Routine) {
    const ok = await confirm({
      title: 'Excluir rotina?',
      message: `"${r.title}" será removida.`,
      confirmLabel: 'Excluir',
      danger: true,
    })
    if (ok) deleteRoutine(r.id)
  }

  const field =
    'rounded-lg bg-white/[.04] px-3 py-2 text-sm text-tinta outline-none ring-1 ring-white/10 focus:ring-2 focus:ring-roxo'

  return (
    <div className="pointer-events-auto mx-auto max-w-2xl px-4 py-6 md:px-8">
      <header className="mb-6">
        <h1 className="flex items-center gap-2 text-2xl font-black text-tinta">
          <Repeat className="text-roxo-claro" /> Rotinas
        </h1>
        <p className="text-sm text-roxo-claro">Hábitos que se repetem.</p>
      </header>

      {tableMissing ? (
        <div className="rounded-xl border border-media/40 bg-media/10 p-4 text-sm text-tinta/80">
          <p className="mb-2 font-semibold text-media">Falta rodar a migration.</p>
          <p className="mb-2">
            A tabela <code className="rounded bg-black/30 px-1">routines</code> ainda
            não existe. Rode{' '}
            <code className="rounded bg-black/30 px-1">
              supabase/migrations/002_routines.sql
            </code>{' '}
            no SQL Editor do Supabase e recarregue.
          </p>
        </div>
      ) : isLoading ? (
        <p className="text-sm text-tinta/40">Carregando…</p>
      ) : (
        <>
          {/* Criar */}
          <div className="mb-6 flex flex-col gap-3 rounded-2xl border border-white/5 bg-white/[.03] p-4">
            <input
              placeholder="Nova rotina (ex: Beber água, Ler 20min)…"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleCreate()}
              className={field}
            />
            <div className="flex flex-wrap items-center gap-2">
              <select
                value={cadence}
                onChange={(e) => setCadence(e.target.value as Cadence)}
                className={field}
              >
                <option value="diaria">Diária</option>
                <option value="semanal">Semanal</option>
                <option value="mensal">Mensal</option>
              </select>
              <input
                type="time"
                value={time}
                onChange={(e) => setTime(e.target.value)}
                className={cn(field, 'w-28')}
              />
              <button
                type="button"
                onClick={handleCreate}
                disabled={!title.trim() || saving}
                className="ml-auto flex items-center gap-1 rounded-lg bg-roxo px-3 py-2 text-sm font-semibold text-white transition hover:bg-roxo-claro disabled:opacity-50"
              >
                <Plus size={16} /> Criar
              </button>
            </div>
            {cadence === 'semanal' && (
              <div className="flex gap-1.5">
                {WEEKDAY_LABELS.map((lbl, d) => (
                  <button
                    key={d}
                    type="button"
                    onClick={() => toggleWeekday(d)}
                    className={cn(
                      'h-8 w-8 rounded-full text-xs font-semibold transition',
                      weekdays.includes(d)
                        ? 'bg-roxo text-white'
                        : 'bg-white/5 text-tinta/50 hover:text-tinta',
                    )}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Lista */}
          {list.length === 0 ? (
            <p className="text-sm text-tinta/30">
              {search ? 'Nenhuma rotina encontrada.' : 'Nenhuma rotina ainda.'}
            </p>
          ) : (
            <ul className="space-y-1.5">
              {list.map((r) => {
                const doneToday = r.lastDone === today
                return (
                  <li
                    key={r.id}
                    className={cn(
                      'group flex items-center gap-3 rounded-xl border border-white/5 bg-white/[.03] px-3 py-2.5',
                      !r.active && 'opacity-50',
                    )}
                  >
                    <button
                      type="button"
                      onClick={() =>
                        updateRoutine({
                          id: r.id,
                          patch: { lastDone: doneToday ? null : today },
                        })
                      }
                      aria-label={doneToday ? 'Desmarcar hoje' : 'Feito hoje'}
                      title={doneToday ? 'Feito hoje' : 'Marcar feito hoje'}
                      className={cn(
                        'flex h-6 w-6 shrink-0 items-center justify-center rounded-md border transition-colors',
                        doneToday
                          ? 'border-concluido bg-concluido text-bg'
                          : 'border-white/25 hover:border-roxo-claro',
                      )}
                    >
                      {doneToday && <Check size={14} strokeWidth={3} />}
                    </button>

                    <span className="min-w-0 flex-1 truncate text-sm text-tinta">
                      {r.title}
                    </span>

                    <span className="shrink-0 text-xs text-roxo-claro">
                      {CADENCE_LABEL[r.cadence]}
                      {r.cadence === 'semanal' && r.weekdays.length > 0
                        ? ` · ${r.weekdays.map((d) => WEEKDAY_LABELS[d]).join('')}`
                        : ''}
                    </span>
                    {r.time && (
                      <span className="shrink-0 text-xs text-tinta/50 tabular-nums">
                        {r.time}
                      </span>
                    )}

                    <div className="flex shrink-0 items-center gap-0.5 opacity-0 transition-opacity group-hover:opacity-100 focus-within:opacity-100">
                      <button
                        type="button"
                        onClick={() =>
                          updateRoutine({ id: r.id, patch: { active: !r.active } })
                        }
                        aria-label={r.active ? 'Pausar' : 'Ativar'}
                        title={r.active ? 'Pausar' : 'Ativar'}
                        className="rounded-md p-1.5 text-tinta/50 hover:bg-white/5 hover:text-tinta"
                      >
                        {r.active ? <Pause size={15} /> : <Play size={15} />}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDelete(r)}
                        aria-label="Excluir"
                        title="Excluir"
                        className="rounded-md p-1.5 text-tinta/50 hover:bg-white/5 hover:text-alta"
                      >
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </>
      )}
    </div>
  )
}
