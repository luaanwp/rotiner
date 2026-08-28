/**
 * Quick Add (standalone) — página Vite separada do app principal para
 * adicionar tarefas e notas ao Rotiner sem abrir a interface completa.
 *
 * Roda num navegador real (dev server + Browser pane, ou aberto direto no
 * seu browser) — NÃO é um Artifact claude.ai, então o CSP não bloqueia as
 * chamadas ao Supabase. Autentica com email+senha (RLS exige auth.uid()).
 *
 * Persiste em duas tabelas reais do schema: `tasks` e `notes`. "Rotina" não
 * é uma tabela no schema v2 — o seletor só oferece task | note.
 */
import { StrictMode, useEffect, useState, type FormEvent } from 'react'
import { createRoot } from 'react-dom/client'
import type { Session } from '@supabase/supabase-js'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'
import type { Priority } from '@/types/models'
import '@/index.css'

type ItemType = 'task' | 'note'
type Feedback = { kind: 'ok' | 'err'; msg: string } | null

// ─── Login ───────────────────────────────────────────────────────────────────
function Login({ onDone }: { onDone: () => void }): React.ReactElement {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault()
    setBusy(true)
    setError(null)
    const { error } = await supabase.auth.signInWithPassword({ email, password })
    setBusy(false)
    if (error) setError(error.message)
    else onDone()
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <h1 className="text-lg font-semibold text-roxo-claro">Entrar no Rotiner</h1>
      <input
        type="email"
        required
        placeholder="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        className="rounded-lg bg-bg-2 px-3 py-2 text-tinta outline-none ring-1 ring-roxo/30 focus:ring-2 focus:ring-roxo"
      />
      <input
        type="password"
        required
        placeholder="senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        className="rounded-lg bg-bg-2 px-3 py-2 text-tinta outline-none ring-1 ring-roxo/30 focus:ring-2 focus:ring-roxo"
      />
      {error && <p className="text-sm text-alta">{error}</p>}
      <button
        type="submit"
        disabled={busy}
        className="rounded-lg bg-roxo px-3 py-2 font-medium text-white transition hover:bg-roxo-claro disabled:opacity-50"
      >
        {busy ? 'Entrando…' : 'Entrar'}
      </button>
    </form>
  )
}

// ─── Formulário de adição ──────────────────────────────────────────────────────
function AddForm({
  session,
  onLogout,
}: {
  session: Session
  onLogout: () => void
}): React.ReactElement {
  const [type, setType] = useState<ItemType>('task')
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [priority, setPriority] = useState<Priority>('media')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [busy, setBusy] = useState(false)
  const [feedback, setFeedback] = useState<Feedback>(null)

  function reset(): void {
    setTitle('')
    setContent('')
    setPriority('media')
    setDate('')
    setTime('')
  }

  async function submit(e: FormEvent): Promise<void> {
    e.preventDefault()
    if (!title.trim()) {
      setFeedback({ kind: 'err', msg: 'Título é obrigatório.' })
      return
    }
    setBusy(true)
    setFeedback(null)

    const userId = session.user.id
    const d = date || null
    const t = time || null

    const { error } =
      type === 'task'
        ? await supabase.from('tasks').insert({
            user_id: userId,
            title: title.trim(),
            date: d,
            time: t,
            priority,
            completed: false,
            project_id: null,
          })
        : await supabase.from('notes').insert({
            user_id: userId,
            title: title.trim(),
            content: content.trim() || null,
            pinned: false,
            date: d,
            time: t,
          })

    setBusy(false)
    if (error) {
      setFeedback({ kind: 'err', msg: error.message })
      return
    }
    setFeedback({
      kind: 'ok',
      msg: `${type === 'task' ? 'Tarefa' : 'Nota'} salva ✓`,
    })
    reset()
  }

  const field =
    'rounded-lg bg-bg-2 px-3 py-2 text-tinta outline-none ring-1 ring-roxo/30 focus:ring-2 focus:ring-roxo'

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold text-roxo-claro">Quick Add</h1>
        <button
          onClick={onLogout}
          className="text-xs text-tinta/50 transition hover:text-tinta"
        >
          sair
        </button>
      </div>

      {/* Seletor de tipo */}
      <div className="flex gap-2">
        {(['task', 'note'] as const).map((t) => (
          <button
            key={t}
            type="button"
            onClick={() => setType(t)}
            className={`flex-1 rounded-lg px-3 py-1.5 text-sm font-medium transition ${
              type === t
                ? 'bg-roxo text-white'
                : 'bg-bg-2 text-tinta/60 hover:text-tinta'
            }`}
          >
            {t === 'task' ? 'Tarefa' : 'Nota'}
          </button>
        ))}
      </div>

      <form onSubmit={submit} className="flex flex-col gap-3">
        <input
          placeholder={type === 'task' ? 'Título da tarefa *' : 'Título da nota *'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          className={field}
        />

        {type === 'note' && (
          <textarea
            placeholder="Conteúdo (opcional)"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            rows={3}
            className={`${field} resize-none`}
          />
        )}

        {type === 'task' && (
          <label className="flex flex-col gap-1 text-xs text-tinta/60">
            Prioridade
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as Priority)}
              className={field}
            >
              <option value="alta">Alta</option>
              <option value="media">Média</option>
              <option value="baixa">Baixa</option>
            </select>
          </label>
        )}

        <div className="flex gap-2">
          <label className="flex flex-1 flex-col gap-1 text-xs text-tinta/60">
            {type === 'task' ? 'Deadline (opcional)' : 'Data (opcional)'}
            <input
              type="date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={field}
            />
          </label>
          <label className="flex flex-1 flex-col gap-1 text-xs text-tinta/60">
            Hora (opcional)
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className={field}
            />
          </label>
        </div>

        {feedback && (
          <p
            className={`text-sm ${
              feedback.kind === 'ok' ? 'text-concluido' : 'text-alta'
            }`}
          >
            {feedback.msg}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="rounded-lg bg-ambar px-3 py-2 font-semibold text-bg transition hover:brightness-110 disabled:opacity-50"
        >
          {busy ? 'Salvando…' : 'Salvar'}
        </button>
      </form>
    </div>
  )
}

// ─── Raiz: gate de config → auth → form ────────────────────────────────────────
function App(): React.ReactElement {
  const [session, setSession] = useState<Session | null>(null)
  const [ready, setReady] = useState(false)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setReady(true)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
    })
    return () => sub.subscription.unsubscribe()
  }, [])

  let body: React.ReactElement
  if (!isSupabaseConfigured) {
    body = (
      <p className="text-sm text-alta">
        Supabase não configurado. Defina VITE_SUPABASE_URL e
        VITE_SUPABASE_PUBLISHABLE_KEY em .env.local.
      </p>
    )
  } else if (!ready) {
    body = <p className="text-sm text-tinta/50">Carregando…</p>
  } else if (!session) {
    body = <Login onDone={() => void 0} />
  } else {
    body = (
      <AddForm
        session={session}
        onLogout={() => void supabase.auth.signOut()}
      />
    )
  }

  return (
    <main className="mx-auto mt-10 w-full max-w-sm rounded-2xl bg-painel p-6 shadow-xl ring-1 ring-roxo/20">
      {body}
    </main>
  )
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
