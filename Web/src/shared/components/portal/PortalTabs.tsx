import type { ReactNode } from 'react'

export type PortalTab = {
  id: string
  label: string
}

export type PortalTabsProps = {
  tabs: PortalTab[]
  activeId: string
  onChange: (id: string) => void
  ariaLabel: string
}

export function PortalTabs({ tabs, activeId, onChange, ariaLabel }: PortalTabsProps) {
  return (
    <div className="cq-portal-tabs" role="tablist" aria-label={ariaLabel}>
      {tabs.map((tab) => {
        const selected = tab.id === activeId
        return (
          <button
            key={tab.id}
            type="button"
            role="tab"
            aria-selected={selected}
            className={`cq-portal-tab${selected ? ' cq-portal-tab--active' : ''}`}
            onClick={() => onChange(tab.id)}
          >
            {tab.label}
          </button>
        )
      })}
    </div>
  )
}
