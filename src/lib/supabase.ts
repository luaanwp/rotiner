/**
 * Client Supabase (§04). Segredo NENHUM no front (RNF-04): só a URL e a
 * publishable key (VITE_*). Nunca service_role / sb_secret_.
 *
 * Se faltar env, exportamos um estado CLARO (isSupabaseConfigured = false)
 * em vez de quebrar silenciosamente — a UI mostra uma mensagem de config.
 */
import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const publishableKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY

export const isSupabaseConfigured = Boolean(url && publishableKey)

if (!isSupabaseConfigured) {
  console.error(
    '[Rotiner] Supabase não configurado. Defina VITE_SUPABASE_URL e ' +
      'VITE_SUPABASE_PUBLISHABLE_KEY em .env.local (veja .env.example).',
  )
}

/**
 * Cliente único do app. Criado mesmo sem env (com placeholders) para não
 * estourar no import; as chamadas só acontecem quando isSupabaseConfigured.
 */
export const supabase = createClient(
  url ?? 'http://localhost:54321',
  publishableKey ?? 'public-anon-key-placeholder',
  {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true,
    },
  },
)
