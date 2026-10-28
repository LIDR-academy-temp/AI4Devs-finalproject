import type { Ref } from 'react'
import { Link } from 'react-router-dom'
import type { NavItem } from '../navigation/appNavigation'
import { useCollapsedNavHint } from './useCollapsedNavHint'

interface SidebarItemProps {
  item: NavItem
  active: boolean
  collapsed: boolean
}

export function SidebarItem({ item, active, collapsed }: SidebarItemProps) {
  const Icon = item.icon
  const { targetRef, onShow, onHide, hintPortal } = useCollapsedNavHint(item.label, collapsed)

  const hoverHandlers = collapsed
    ? {
        onMouseEnter: onShow,
        onMouseLeave: onHide,
        onFocus: onShow,
        onBlur: onHide,
      }
    : {}

  const rowClass = [
    'cq-nav-item group relative flex items-center rounded-md no-underline transition-colors duration-150',
    collapsed ? 'justify-center px-0 py-0.5' : 'gap-2 px-1.5 py-0.5',
    active ? 'cq-nav-item--active font-medium text-white' : 'text-white/80 hover:bg-white/8 hover:text-white',
  ].join(' ')

  const iconClass = [
    'cq-nav-icon flex shrink-0 items-center justify-center rounded-md transition-colors',
    active
      ? 'bg-primary text-white'
      : 'bg-white/5 text-primary-light group-hover:bg-white/10 group-hover:text-white',
  ].join(' ')

  if (!item.implemented) {
    return (
      <>
        <span
          ref={targetRef}
          title={collapsed ? undefined : 'Próximamente'}
          className={`${rowClass} cursor-not-allowed opacity-45`}
          {...hoverHandlers}
        >
          <span className={iconClass}>
            <Icon className="cq-nav-icon-svg" aria-hidden="true" />
          </span>
          {!collapsed && <span className="cq-nav-label truncate">{item.label}</span>}
        </span>
        {hintPortal}
      </>
    )
  }

  return (
    <>
      <Link
        ref={targetRef as Ref<HTMLAnchorElement>}
        to={item.path}
        aria-label={item.label}
        aria-current={active ? 'page' : undefined}
        className={rowClass}
        {...hoverHandlers}
      >
        <span className={iconClass}>
          <Icon className="cq-nav-icon-svg" aria-hidden="true" />
        </span>
        {!collapsed && <span className="cq-nav-label min-w-0 truncate">{item.label}</span>}
      </Link>
      {hintPortal}
    </>
  )
}
