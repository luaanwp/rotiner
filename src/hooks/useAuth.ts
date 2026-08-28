/**
 * Auth (§05 RF-01/02). onAuthStateChange mantém a sessão em estado; a sessão
 * persiste no localStorage (persistSession no client), então reload continua logado.
 *
 * `useAuth` é chamado UMA vez no App (gate auth vs shell). As ações
 * (signUp/signIn/signOut) são funções soltas — qualquer componente importa.
 */
import { useEffect, useState } from 'react'
import type { Session, User } from '@supabase/supabase-js'
import { supabase } from '@/lib/supabase'

export interface AuthState {
  session: Session | null
  user: User | null
  loading: boolean
}

export function useAuth(): AuthState {
  const [session, setSession] = useState<Session | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session)
      setLoading(false)
    })
    const { data } = supabase.auth.onAuthStateChange((_event, next) => {
      setSession(next)
    })
    return () => data.subscription.unsubscribe()
  }, [])

  return { session, user: session?.user ?? null, loading }
}

export function signUp(email: string, password: string) {
  return supabase.auth.signUp({ email, password })
}

export function signInWithPassword(email: string, password: string) {
  return supabase.auth.signInWithPassword({ email, password })
}

export function signOut() {
  return supabase.auth.signOut()
}
