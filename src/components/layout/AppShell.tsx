/**
 * Esqueleto do app logado (§08) — o Canvas de bolinhas é o FUNDO constante;
 * NavRail/TopBar/views/MobileNav/FAB são uma camada de UI fixa por cima (não
 * sofrem pan/zoom). A camada de UI deixa o clique passar pro canvas no vazio
 * (pointer-events), então dá pra arrastar o fundo entre/ao redor dos painéis.
 * Quando um popup abre, todo o fundo (canvas + UI) desfoca; os popups ficam
 * nítidos porque são portais no body, fora deste wrapper.
 */
import type { ComponentType } from 'react'
import type { User } from '@supabase/supabase-js'
import { useUiStore, type ViewId } from '@/stores/useUiStore'
import { Viewport } from '@/components/canvas/Viewport'
import { NavRail } from './NavRail'
import { MobileNav } from './MobileNav'
import { TopBar } from './TopBar'
import { Fab } from './Fab'
import { Composer } from '@/components/popups/Composer'
import { ProjectDrawer } from '@/components/popups/ProjectDrawer'
import { ConfirmDialog } from '@/components/popups/ConfirmDialog'
import TodayView from '@/views/TodayView'
import RotinasView from '@/views/RotinasView'
import CalendarView from '@/views/CalendarView'
import ProjectsView from '@/views/ProjectsView'
import BoardsView from '@/views/BoardsView'

const VIEWS: Record<ViewId, ComponentType> = {
  hoje: TodayView,
  rotinas: RotinasView,
  calendario: CalendarView,
  projetos: ProjectsView,
  quadros: BoardsView,
}

export function AppShell({ user }: { user: User }) {
  const view = useUiStore((s) => s.view)
  const activePopup = useUiStore((s) => s.activePopup)
  const CurrentView = VIEWS[view]
  const email = user.email ?? 'conta'

  return (
    <div className="relative h-dvh w-full overflow-hidden">
      {/* fundo desfocável: canvas + camada de UI */}
      <div
        className="absolute inset-0 transition-[filter] duration-150"
        style={{ filter: activePopup ? 'blur(6px) brightness(0.7)' : undefined }}
      >
        {/* canvas de bolinhas — fundo interativo (pan/zoom) */}
        <Viewport />

        {/* camada de UI: container deixa passar clique no vazio → pan do canvas */}
        <div className="pointer-events-none absolute inset-0 flex">
          <NavRail />
          <div className="flex min-w-0 flex-1 flex-col">
            <TopBar email={email} />
            <main className="pointer-events-none min-h-0 flex-1 overflow-auto pb-16 md:pb-0">
              <CurrentView />
            </main>
          </div>
          <MobileNav />
        </div>

        <Fab />
      </div>

      {/* popups nítidos (portais no body, fora do wrapper desfocado) */}
      <Composer />
      <ProjectDrawer />
      <ConfirmDialog />
    </div>
  )
}
