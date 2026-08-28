/**
 * Tela de entrada (§05 RF-01) — cadastro/login por e-mail+senha.
 * Senha mínima de 6. Se o signUp não retornar sessão (confirmação de e-mail
 * ligada no Supabase), mostra "confira o seu e-mail".
 */
import { useState, type FormEvent } from 'react'
import { signInWithPassword, signUp } from '@/hooks/useAuth'
import { isSupabaseConfigured } from '@/lib/supabase'
import { Button } from '@/components/ui/Button'
import { Input } from '@/components/ui/Input'

type Mode = 'login' | 'signup'

export default function AuthScreen() {
  const [mode, setMode] = useState<Mode>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [notice, setNotice] = useState<string | null>(null)

  async function handleSubmit(e: FormEvent) {
    e.preventDefault()
    setError(null)
    setNotice(null)
    if (password.length < 6) {
      setError('A senha precisa de pelo menos 6 caracteres.')
      return
    }
    setBusy(true)
    try {
      if (mode === 'signup') {
        const { data, error } = await signUp(email, password)
        if (error) throw error
        if (!data.session) {
          setNotice('Conta criada! Confira o seu e-mail para confirmar o acesso.')
        }
      } else {
        const { error } = await signInWithPassword(email, password)
        if (error) throw error
      }
      // com sessão, o onAuthStateChange no App troca pra shell automaticamente.
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Algo deu errado.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-6">
      <div className="w-full max-w-sm rounded-2xl bg-painel/80 p-8 shadow-xl ring-1 ring-white/10 backdrop-blur">
        <div className="mb-6 text-center">
          <h1 className="text-3xl font-black text-tinta">Rotiner</h1>
          <p className="mt-1 text-sm text-roxo-claro">
            {mode === 'login' ? 'Entre na sua conta' : 'Crie a sua conta'}
          </p>
        </div>

        {!isSupabaseConfigured && (
          <p className="mb-4 rounded-lg bg-alta/15 p-3 text-sm text-alta">
            Supabase não configurado. Defina as variáveis em .env.local.
          </p>
        )}

        <form onSubmit={handleSubmit} className="space-y-3">
          <Input
            type="email"
            required
            autoComplete="email"
            placeholder="voce@email.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            aria-label="E-mail"
          />
          <Input
            type="password"
            required
            minLength={6}
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
            placeholder="senha (mín. 6)"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            aria-label="Senha"
          />

          {error && <p className="text-sm text-alta">{error}</p>}
          {notice && <p className="text-sm text-concluido">{notice}</p>}

          <Button type="submit" disabled={busy} className="w-full">
            {busy ? '...' : mode === 'login' ? 'Entrar' : 'Cadastrar'}
          </Button>
        </form>

        <button
          type="button"
          onClick={() => {
            setMode(mode === 'login' ? 'signup' : 'login')
            setError(null)
            setNotice(null)
          }}
          className="mt-4 w-full text-center text-sm text-roxo-claro hover:text-tinta"
        >
          {mode === 'login'
            ? 'Não tem conta? Cadastre-se'
            : 'Já tem conta? Entrar'}
        </button>
      </div>
    </main>
  )
}
