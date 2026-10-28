import { ChevronDown, ChevronRight } from 'lucide-react'
import { useState } from 'react'
import type { MenuAdminItem } from './types'

type MenuTreeEditorProps = {
  menus: MenuAdminItem[]
  selectedId: number | null
  onSelect: (menu: MenuAdminItem) => void
}

export function MenuTreeEditor({ menus, selectedId, onSelect }: MenuTreeEditorProps) {
  const roots = menus.filter((m) => !m.padreMenuId && !m.eliminado)
  const childrenOf = (padreId: number) =>
    menus.filter((m) => m.padreMenuId === padreId && !m.eliminado).sort((a, b) => a.orden - b.orden)

  return (
    <ul className="list-none space-y-0.5 p-0" role="tree">
      {roots
        .sort((a, b) => a.orden - b.orden)
        .map((node) => (
          <TreeNode
            key={node.menuId}
            node={node}
            childrenOf={childrenOf}
            selectedId={selectedId}
            onSelect={onSelect}
            depth={0}
          />
        ))}
    </ul>
  )
}

function TreeNode({
  node,
  childrenOf,
  selectedId,
  onSelect,
  depth,
}: {
  node: MenuAdminItem
  childrenOf: (id: number) => MenuAdminItem[]
  selectedId: number | null
  onSelect: (menu: MenuAdminItem) => void
  depth: number
}) {
  const children = childrenOf(node.menuId)
  const [open, setOpen] = useState(true)
  const hasChildren = children.length > 0
  const selected = selectedId === node.menuId

  return (
    <li role="treeitem" aria-expanded={hasChildren ? open : undefined}>
      <div
        className={`flex min-w-0 items-center gap-1 rounded-md px-2 py-1.5 ${
          selected ? 'bg-primary/10 text-primary-dark' : 'hover:bg-surface-muted'
        }`}
        style={{ paddingLeft: `${depth * 12 + 8}px` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="cursor-pointer shrink-0 rounded p-0.5 text-muted hover:text-primary-dark"
            aria-label={open ? 'Contraer' : 'Expandir'}
            onClick={() => setOpen((v) => !v)}
          >
            {open ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="w-5 shrink-0" />
        )}
        <button
          type="button"
          className="min-w-0 flex-1 cursor-pointer truncate text-left text-sm"
          onClick={() => onSelect(node)}
        >
          {node.titulo}
          {node.ruta ? (
            <span className="ml-1 text-xs text-muted tabular-nums">({node.ruta})</span>
          ) : null}
        </button>
      </div>
      {hasChildren && open && (
        <ul className="list-none p-0" role="group">
          {children.map((child) => (
            <TreeNode
              key={child.menuId}
              node={child}
              childrenOf={childrenOf}
              selectedId={selectedId}
              onSelect={onSelect}
              depth={depth + 1}
            />
          ))}
        </ul>
      )}
    </li>
  )
}
