/**
 * App — só roteia auth vs shell + monta os providers (§08).
 * Sem sessão → AuthScreen; com sessão → AppShell.
 */
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useAuth } from '@/hooks/useAuth'
import { useRealtimeSync } from '@/hooks/useRealtimeSync'
import { AppShell } from '@/components/layout/AppShell'
import AuthScreen from '@/views/AuthScreen'

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, refetchOnWindowFocus: false, retry: 1 },
  },
})

function Gate() {
  const { user, loading } = useAuth()
  useRealtimeSync(!!user)
  if (loading) {
    return (
      <div className="flex min-h-dvh items-center justify-center text-roxo-claro">
        Carregando…
      </div>
    )
  }
  return user ? <AppShell user={user} /> : <AuthScreen />
}

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <Gate />
    </QueryClientProvider>
  )
}
