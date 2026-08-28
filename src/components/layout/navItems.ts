import { CalendarDays, Columns3, FolderKanban, Sunrise } from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import type { ViewId } from '@/stores/useUiStore'

export interface NavItem {
  id: ViewId
  label: string
  icon: LucideIcon
}

/** Fonte única dos itens de navegação — usada por NavRail (desktop) e MobileNav. */
export const NAV_ITEMS: readonly NavItem[] = [
  { id: 'hoje', label: 'Hoje', icon: Sunrise },
  { id: 'calendario', label: 'Calendário', icon: CalendarDays },
  { id: 'projetos', label: 'Projetos', icon: FolderKanban },
  { id: 'quadros', label: 'Quadros', icon: Columns3 },
]
