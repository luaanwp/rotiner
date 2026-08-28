/**
 * Calendário (§05 RF-06/07) — grid mensal 6×7 (segunda→domingo) + agenda
 * diária do dia selecionado. Notas com data aparecem no mês; com hora, na
 * agenda posicionadas por minuto (layoutTimedNotes preserva a lógica da v1).
 * Clicar numa faixa vazia da agenda cria uma nota com date+time preenchidos.
 */
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, Pin } from 'lucide-react'
import { useNotes } from '@/hooks/useNotes'
import { useComposer } from '@/stores/useComposer'
import { useUiStore } from '@/stores/useUiStore'
import {
  HOUR_HEIGHT,
  addMonths,
  buildMonthDays,
  dateKey,
  formatLongDate,
  formatMonthTitle,
  layoutTimedNotes,
} from '@/lib/dates'
import { cn } from '@/lib/cn'
import type { Note } from '@/types/models'

const WEEKDAYS = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
const HOURS = Array.from({ length: 24 }, (_, h) => h)

export default function CalendarView() {
  const { notes } = useNotes()
  const openNewNote = useComposer((s) => s.openNewNote)
  const openEditNote = useComposer((s) => s.openEditNote)
  const search = useUiStore((s) => s.search).toLowerCase().trim()

  const today = dateKey()
  const [cursor, setCursor] = useState(() => new Date())
  const [selected, setSelected] = useState(today)

  const matches = (n: Note) =>
    !search ||
    (n.title ?? '').toLowerCase().includes(search) ||
    (n.content ?? '').toLowerCase().includes(search)

  // notas por dia (chave YYYY-MM-DD) — só as que têm data
  const byDay = useMemo(() => {
    const map = new Map<string, Note[]>()
    for (const n of notes) {
      if (!n.date || !matches(n)) continue
      const list = map.get(n.date) ?? []
      list.push(n)
      map.set(n.date, list)
    }
    return map
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [notes, search])

  const days = useMemo(() => buildMonthDays(cursor), [cursor])

  const dayNotes = byDay.get(selected) ?? []
  const untimed = dayNotes.filter((n) => !n.time)
  const timed = useMemo(
    () => layoutTimedNotes(dayNotes.filter((n) => n.time), (n) => n.time),
    [dayNotes],
  )

  return (
    <div className="pointer-events-auto flex h-full flex-col gap-4 p-4 md:px-8 lg:flex-row">
      {/* ─── Mês ─── */}
      <section className="lg:w-1/2 lg:max-w-xl">
        <header className="mb-3 flex items-center justify-between">
          <h1 className="text-xl font-black text-tinta">{formatMonthTitle(cursor)}</h1>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={() => {
                setCursor(new Date())
                setSelected(today)
              }}
              className="rounded-lg px-3 py-1.5 text-sm text-roxo-claro hover:bg-white/5"
            >
              Hoje
            </button>
            <button
              type="button"
              onClick={() => setCursor((c) => addMonths(c, -1))}
              aria-label="Mês anterior"
              className="rounded-lg p-1.5 text-tinta/60 hover:bg-white/5 hover:text-tinta"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => setCursor((c) => addMonths(c, 1))}
              aria-label="Próximo mês"
              className="rounded-lg p-1.5 text-tinta/60 hover:bg-white/5 hover:text-tinta"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </header>

        <div className="mb-1 grid grid-cols-7 text-center text-xs text-tinta/40">
          {WEEKDAYS.map((w) => (
            <div key={w} className="py-1">
              {w}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7 gap-1">
          {days.map((d) => {
            const count = (byDay.get(d.key) ?? []).length
            const isToday = d.key === today
            const isSelected = d.key === selected
            return (
              <button
                key={d.key}
                type="button"
                onClick={() => setSelected(d.key)}
                className={cn(
                  'flex aspect-square flex-col items-center justify-center rounded-lg text-sm transition-colors',
                  d.isCurrentMonth ? 'text-tinta' : 'text-tinta/25',
                  isSelected
                    ? 'bg-roxo text-white'
                    : 'hover:bg-white/5',
                  isToday && !isSelected && 'ring-1 ring-roxo-claro',
                )}
              >
                <span className="tabular-nums">{d.day}</span>
                {count > 0 && (
                  <span
                    className={cn(
                      'mt-0.5 h-1.5 w-1.5 rounded-full',
                      isSelected ? 'bg-white' : 'bg-roxo-claro',
                    )}
                    title={`${count} nota(s)`}
                  />
                )}
              </button>
            )
          })}
        </div>
      </section>

      {/* ─── Agenda diária ─── */}
      <section className="flex min-h-0 flex-1 flex-col rounded-xl border border-white/10 bg-black/10">
        <header className="border-b border-white/10 px-4 py-3">
          <h2 className="text-sm font-semibold text-tinta first-letter:uppercase">
            {formatLongDate(selected)}
          </h2>
        </header>

        {/* sem hora marcada */}
        <div className="border-b border-white/10 px-4 py-2">
          <p className="mb-1 text-xs text-tinta/40">Sem hora marcada</p>
          {untimed.length === 0 ? (
            <button
              type="button"
              onClick={() => openNewNote({ date: selected })}
              className="text-xs text-tinta/30 hover:text-roxo-claro"
            >
              + adicionar nota do dia
            </button>
          ) : (
            <ul className="space-y-1">
              {untimed.map((n) => (
                <NoteChip key={n.id} note={n} onClick={() => openEditNote(n)} />
              ))}
            </ul>
          )}
        </div>

        {/* faixas de hora */}
        <div className="relative min-h-0 flex-1 overflow-auto">
          <div className="relative" style={{ height: HOURS.length * HOUR_HEIGHT }}>
            {/* linhas de hora clicáveis (faixa vazia → nova nota) */}
            {HOURS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() =>
                  openNewNote({
                    date: selected,
                    time: `${String(h).padStart(2, '0')}:00`,
                  })
                }
                aria-label={`Criar nota às ${String(h).padStart(2, '0')}:00`}
                className="absolute left-0 flex w-full items-start border-t border-white/5 pl-14 text-left hover:bg-white/[.03]"
                style={{ top: h * HOUR_HEIGHT, height: HOUR_HEIGHT }}
              >
                <span className="absolute left-2 -top-2 text-[10px] text-tinta/30 tabular-nums">
                  {String(h).padStart(2, '0')}:00
                </span>
              </button>
            ))}

            {/* notas com hora, posicionadas por minuto e espalhadas em colunas */}
            {timed.map(({ item, layout }) => {
              const widthPct = 100 / layout.columns
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => openEditNote(item)}
                  className="absolute overflow-hidden rounded-md border border-roxo-claro/40 bg-roxo/40 px-2 py-1 text-left text-xs text-tinta backdrop-blur-sm hover:bg-roxo/60"
                  style={{
                    top: layout.top,
                    height: Math.max(layout.height - 2, 18),
                    left: `calc(3.5rem + (100% - 3.5rem) * ${layout.column * widthPct} / 100)`,
                    width: `calc((100% - 3.5rem) * ${widthPct} / 100 - 2px)`,
                  }}
                >
                  <span className="font-medium tabular-nums">{item.time}</span>{' '}
                  <span className="text-tinta/80">{item.title ?? item.content}</span>
                </button>
              )
            })}
          </div>
        </div>
      </section>
    </div>
  )
}

function NoteChip({ note, onClick }: { note: Note; onClick: () => void }) {
  return (
    <li>
      <button
        type="button"
        onClick={onClick}
        className="flex w-full items-center gap-2 rounded-lg border border-white/5 bg-white/[.03] px-2.5 py-1.5 text-left text-sm text-tinta hover:border-roxo-claro/40"
      >
        {note.pinned && <Pin size={12} className="shrink-0 text-ambar" />}
        <span className="min-w-0 flex-1 truncate">
          {note.title ?? note.content}
        </span>
      </button>
    </li>
  )
}
