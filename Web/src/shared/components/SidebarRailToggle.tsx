import type { Ref } from 'react'
import { PanelLeftClose, PanelLeftOpen } from 'lucide-react'
import { useCollapsedNavHint } from './useCollapsedNavHint'

type SidebarRailToggleProps = {
  collapsed: boolean
  onToggle: () => void
}

export function SidebarRailToggle({ collapsed, onToggle }: SidebarRailToggleProps) {
  const hintLabel = collapsed ? 'Expandir menú' : 'Colapsar menú'
  const { targetRef, onShow, onHide, hintPortal } = useCollapsedNavHint(hintLabel, collapsed)

  const hoverHandlers = collapsed
    ? { onMouseEnter: onShow, onMouseLeave: onHide, onFocus: onShow, onBlur: onHide }
    : {}

  return (
    <>
      <button
        ref={targetRef as Ref<HTMLButtonElement>}
        type="button"
        onClick={onToggle}
        className={`cq-nav-item cq-nav-rail-toggle flex w-full cursor-pointer items-center rounded-md text-white/75 transition-colors hover:bg-white/8 hover:text-white ${
          collapsed ? 'justify-center px-0 py-1' : 'gap-2 px-1.5 py-1'
        }`}
        aria-expanded={!collapsed}
        aria-label={hintLabel}
        {...hoverHandlers}
      >
        <span className="cq-nav-icon flex shrink-0 items-center justify-center rounded-md bg-white/5">
          {collapsed ? (
            <PanelLeftOpen className="cq-nav-icon-svg" aria-hidden="true" />
          ) : (
            <PanelLeftClose className="cq-nav-icon-svg" aria-hidden="true" />
          )}
        </span>
        {!collapsed && <span className="cq-nav-label truncate font-medium">Colapsar menú</span>}
      </button>
      {hintPortal}
    </>
  )
}
