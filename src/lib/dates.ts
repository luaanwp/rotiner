/**
 * Utilitários de data — portados do App.jsx da v1 (Anexo A do spec), tipados.
 *
 * Regra de ouro (§17): datas locais SEMPRE lidas como `new Date(`${key}T12:00:00`)`,
 * nunca `new Date("2026-07-28")` cru — evita o "dia que pula" por UTC.
 * A semana começa na SEGUNDA (mondayOffset).
 */

/** Altura de uma faixa de 1h na agenda diária (px) — usado pela Fase 5. */
export const HOUR_HEIGHT = 72

/** Duração assumida de uma nota com horário, em minutos (para detectar sobreposição). */
export const SLOT_MINUTES = 30

// ─── Identidade ──────────────────────────────────────────────────────────────

/** id com fallback quando crypto.randomUUID não existe. */
export function createId(): string {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`
}

// ─── Parse / chave local ─────────────────────────────────────────────────────

/** Parse local seguro — evita o dia "pular" por UTC. */
export function parseDateKey(value?: string | null): Date {
  if (!value) return new Date()
  return new Date(`${value}T12:00:00`)
}

/** Chave YYYY-MM-DD no fuso local. */
export function dateKey(date: Date = new Date()): string {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000)
  return local.toISOString().slice(0, 10)
}

/** Soma `days` dias a uma chave YYYY-MM-DD e devolve a nova chave. */
export function addDaysKey(key: string, days: number): string {
  const d = parseDateKey(key)
  d.setDate(d.getDate() + days)
  return dateKey(d)
}

// ─── Formatação (pt-BR) ──────────────────────────────────────────────────────

const fmtShort = new Intl.DateTimeFormat('pt-BR', {
  day: '2-digit',
  month: '2-digit',
})
const fmtLong = new Intl.DateTimeFormat('pt-BR', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
})
const fmtMonth = new Intl.DateTimeFormat('pt-BR', {
  month: 'long',
  year: 'numeric',
})

/** "28/07" a partir de uma chave ou Date. */
export function formatDate(value: string | Date): string {
  const d = typeof value === 'string' ? parseDateKey(value) : value
  return fmtShort.format(d)
}

/** "segunda-feira, 28 de julho" a partir de uma chave ou Date. */
export function formatLongDate(value: string | Date): string {
  const d = typeof value === 'string' ? parseDateKey(value) : value
  return fmtLong.format(d)
}

/** "julho de 2026" — título do mês. */
export function formatMonthTitle(cursor: Date): string {
  const title = fmtMonth.format(cursor)
  return title.charAt(0).toUpperCase() + title.slice(1)
}

/** Cursor de mês somado por `n` meses (positivo ou negativo). */
export function addMonths(cursor: Date, n: number): Date {
  return new Date(cursor.getFullYear(), cursor.getMonth() + n, 1, 12)
}

// ─── Grid do mês ─────────────────────────────────────────────────────────────

export interface MonthDay {
  date: Date
  key: string
  day: number
  isCurrentMonth: boolean
}

/** Grid do mês: 42 células, semana começando na SEGUNDA. */
export function buildMonthDays(cursor: Date): MonthDay[] {
  const year = cursor.getFullYear()
  const month = cursor.getMonth()
  const firstDay = new Date(year, month, 1, 12)
  const mondayOffset = (firstDay.getDay() + 6) % 7 // seg=0 … dom=6
  const gridStart = new Date(year, month, 1 - mondayOffset, 12)
  return Array.from({ length: 42 }, (_, i) => {
    const d = new Date(gridStart)
    d.setDate(gridStart.getDate() + i)
    return {
      date: d,
      key: dateKey(d),
      day: d.getDate(),
      isCurrentMonth: d.getMonth() === month,
    }
  })
}

// ─── Agenda diária ───────────────────────────────────────────────────────────

/** Minutos desde 00:00 — usado pela agenda diária. */
export function timeToMinutes(time?: string | null): number {
  if (!time) return 0
  const [h, m] = time.split(':').map(Number)
  return h * 60 + m
}

export interface TimedLayout {
  /** coluna (0-based) atribuída à nota dentro do cluster de sobreposição */
  column: number
  /** total de colunas do cluster — largura = 1/columns */
  columns: number
  /** topo em px na agenda */
  top: number
  /** altura em px na agenda */
  height: number
}

/**
 * Distribui notas com horário em colunas para que sobreposições não fiquem
 * ilegíveis (portado da lógica da v1). Cada nota ocupa `SLOT_MINUTES` a partir
 * do seu horário; notas cujos intervalos se cruzam formam um cluster e são
 * espalhadas em colunas lado a lado.
 *
 * @param items itens com um horário "HH:mm"
 * @param getTime como extrair o horário de cada item
 * @returns mesmo array (na ordem cronológica) com o layout de cada item
 */
export function layoutTimedNotes<T>(
  items: readonly T[],
  getTime: (item: T) => string | null | undefined,
): Array<{ item: T; layout: TimedLayout }> {
  const pxPerMinute = HOUR_HEIGHT / 60
  const sorted = [...items]
    .map((item) => {
      const start = timeToMinutes(getTime(item))
      return { item, start, end: start + SLOT_MINUTES }
    })
    .sort((a, b) => a.start - b.start || a.end - b.end)

  const result: Array<{ item: T; layout: TimedLayout }> = []
  let cluster: typeof sorted = []
  let clusterEnd = -1

  const flush = () => {
    if (cluster.length === 0) return
    // coloração gulosa por colunas dentro do cluster
    const colEndTimes: number[] = []
    const colOf = new Map<(typeof cluster)[number], number>()
    for (const node of cluster) {
      let placed = false
      for (let c = 0; c < colEndTimes.length; c++) {
        if (node.start >= colEndTimes[c]) {
          colEndTimes[c] = node.end
          colOf.set(node, c)
          placed = true
          break
        }
      }
      if (!placed) {
        colOf.set(node, colEndTimes.length)
        colEndTimes.push(node.end)
      }
    }
    const columns = colEndTimes.length
    for (const node of cluster) {
      result.push({
        item: node.item,
        layout: {
          column: colOf.get(node) ?? 0,
          columns,
          top: node.start * pxPerMinute,
          height: SLOT_MINUTES * pxPerMinute,
        },
      })
    }
    cluster = []
    clusterEnd = -1
  }

  for (const node of sorted) {
    if (cluster.length > 0 && node.start >= clusterEnd) flush()
    cluster.push(node)
    clusterEnd = Math.max(clusterEnd, node.end)
  }
  flush()

  return result
}
