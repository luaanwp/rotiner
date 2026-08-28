/** Rail de navegação no desktop (~72px). Ícones lucide + tooltip; ativo em roxo. */
import { useUiStore } from '@/stores/useUiStore'
import { cn } from '@/lib/cn'
import { NAV_ITEMS } from './navItems'

export function NavRail() {
  const view = useUiStore((s) => s.view)
  const setView = useUiStore((s) => s.setView)

  return (
    <nav
      aria-label="Navegação principal"
      className="pointer-events-auto hidden w-[72px] shrink-0 flex-col items-center gap-2 border-r border-white/10 bg-bg/60 py-4 backdrop-blur-sm md:flex"
    >
      <div className="mb-2 flex h-10 w-10 items-center justify-center rounded-xl bg-roxo text-lg font-black text-white">
        R
      </div>
      {NAV_ITEMS.map(({ id, label, icon: Icon }) => {
        const active = view === id
        return (
          <button
            key={id}
            type="button"
            onClick={() => setView(id)}
            aria-label={label}
            aria-current={active ? 'page' : undefined}
            title={label}
            className={cn(
              'group relative flex h-12 w-12 items-center justify-center rounded-xl transition-colors',
              active
                ? 'bg-roxo text-white'
                : 'text-tinta/60 hover:bg-white/5 hover:text-tinta',
            )}
          >
            <Icon size={22} aria-hidden />
            <span className="pointer-events-none absolute left-full ml-2 whitespace-nowrap rounded-md bg-painel px-2 py-1 text-xs opacity-0 shadow-lg transition-opacity group-hover:opacity-100">
              {label}
            </span>
          </button>
        )
      })}
    </nav>
  )
}
