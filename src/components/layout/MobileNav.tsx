/** Navegação inferior fixa no mobile — 4 itens, respeitando a safe-area. */
import { useUiStore } from '@/stores/useUiStore'
import { cn } from '@/lib/cn'
import { NAV_ITEMS } from './navItems'

export function MobileNav() {
  const view = useUiStore((s) => s.view)
  const setView = useUiStore((s) => s.setView)

  return (
    <nav
      aria-label="Navegação principal"
      className="pointer-events-auto fixed inset-x-0 bottom-0 z-30 flex border-t border-white/10 bg-painel/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden"
    >
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const active = view === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            className={cn(
              'flex flex-1 flex-col items-center gap-1 py-2 text-[11px] transition-colors',
              active ? 'text-roxo-claro' : 'text-tinta/55',
            )}
          >
            <Icon size={22} aria-hidden />
            {label}
          </button>
        )
      })}
    </nav>
  )
}
