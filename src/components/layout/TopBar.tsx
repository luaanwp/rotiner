/**
 * Barra superior — busca contextual (grava em useUiStore), indicador de sync
 * (React Query fetching/mutating) e menu de conta com logout.
 */
import { useState } from 'react'
import { useIsFetching, useIsMutating } from '@tanstack/react-query'
import { Check, LogOut, RefreshCw, Search } from 'lucide-react'
import { useUiStore } from '@/stores/useUiStore'
import { signOut } from '@/hooks/useAuth'
import { NAV_ITEMS } from './navItems'

interface Props {
  email: string
}

export function TopBar({ email }: Props) {
  const view = useUiStore((s) => s.view)
  const search = useUiStore((s) => s.search)
  const setSearch = useUiStore((s) => s.setSearch)
  const [menuOpen, setMenuOpen] = useState(false)

  const syncing = useIsFetching() + useIsMutating() > 0
  const viewLabel = NAV_ITEMS.find((n) => n.id === view)?.label ?? ''

  return (
    <header className="pointer-events-auto flex h-14 shrink-0 items-center gap-3 border-b border-white/10 bg-bg/60 px-4 backdrop-blur-sm">
      <label className="flex h-9 flex-1 items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3">
        <Search size={16} className="text-tinta/40" aria-hidden />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder={`Buscar em ${viewLabel}…`}
          aria-label={`Buscar em ${viewLabel}`}
          className="w-full bg-transparent text-sm text-tinta placeholder:text-tinta/40 focus:outline-none"
        />
      </label>

      <span
        className="flex items-center gap-1.5 text-xs text-tinta/50"
        title={syncing ? 'Sincronizando…' : 'Tudo sincronizado'}
        aria-live="polite"
      >
        {syncing ? (
          <RefreshCw size={14} className="animate-spin" aria-hidden />
        ) : (
          <Check size={14} className="text-concluido" aria-hidden />
        )}
        <span className="hidden sm:inline">{syncing ? 'Sync…' : 'Ok'}</span>
      </span>

      <div className="relative">
        <button
          type="button"
          onClick={() => setMenuOpen((o) => !o)}
          aria-label="Menu da conta"
          aria-expanded={menuOpen}
          className="flex h-9 w-9 items-center justify-center rounded-full bg-roxo text-sm font-bold text-white uppercase"
        >
          {email.charAt(0)}
        </button>
        {menuOpen && (
          <>
            <div
              className="fixed inset-0 z-40"
              onClick={() => setMenuOpen(false)}
              aria-hidden
            />
            <div className="absolute right-0 z-50 mt-2 w-56 rounded-xl border border-white/10 bg-painel p-2 shadow-xl">
              <p className="truncate px-2 py-1.5 text-xs text-tinta/60">{email}</p>
              <button
                type="button"
                onClick={() => {
                  setMenuOpen(false)
                  void signOut()
                }}
                className="flex w-full items-center gap-2 rounded-lg px-2 py-2 text-sm text-tinta hover:bg-white/5"
              >
                <LogOut size={16} aria-hidden />
                Sair
              </button>
            </div>
          </>
        )}
      </div>
    </header>
  )
}
