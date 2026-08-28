/**
 * Sync em tempo real (RF-13) — PC ↔ celular. Escuta `postgres_changes` do
 * Supabase Realtime em todas as tabelas do domínio e invalida as queries do
 * React Query correspondentes, disparando um refetch. O refetch passa pela
 * REST autenticada (RLS), então só traz as linhas do próprio usuário.
 *
 * As tabelas já estão na publicação `supabase_realtime` (supabase/schema.sql).
 * Mutations otimistas locais também ecoam por aqui — o refetch resultante
 * devolve os mesmos dados, custo baixo, sem inconsistência.
 */
import { useEffect } from 'react'
import { useQueryClient } from '@tanstack/react-query'
import { supabase, isSupabaseConfigured } from '@/lib/supabase'

/** Tabela (banco) → query keys (React Query) que ela alimenta. */
const TABLE_KEYS: Record<string, readonly (readonly string[])[]> = {
  tasks: [['tasks']],
  notes: [['notes']],
  projects: [['projects']],
  routines: [['routines']],
  boards: [['board']],
  board_columns: [['board']],
  // cards abastecem tanto as colunas do quadro quanto os post-its livres.
  cards: [['board'], ['canvas-cards']],
}

/**
 * @param enabled só assina quando há sessão (passe `!!user`). Ao deslogar,
 *   `enabled` vira false e o canal é removido.
 */
export function useRealtimeSync(enabled: boolean): void {
  const qc = useQueryClient()

  useEffect(() => {
    if (!enabled || !isSupabaseConfigured) return

    let channel = supabase.channel('rotiner-sync')

    for (const [table, keys] of Object.entries(TABLE_KEYS)) {
      channel = channel.on(
        'postgres_changes',
        { event: '*', schema: 'public', table },
        () => {
          for (const key of keys) {
            void qc.invalidateQueries({ queryKey: key })
          }
        },
      )
    }

    channel.subscribe()

    return () => {
      void supabase.removeChannel(channel)
    }
  }, [enabled, qc])
}
