import { ChevronDown, ChevronRight, Plus } from 'lucide-react'
import { useMemo, useState } from 'react'
import { iconFromMenuKey } from './menuIcons'
import type { MenuAdminItem } from './types'

type MenuTreeEditorProps = {
  menus: MenuAdminItem[]
  selectedId: number | null
  searchQuery?: string
  onSelect: (menu: MenuAdminItem) => void
  onAddChild?: (parent: MenuAdminItem) => void
}

export function MenuTreeEditor({
  menus,
  selectedId,
  searchQuery = '',
  onSelect,
  onAddChild,
}: MenuTreeEditorProps) {
  const roots = useMemo(
    () =>
      menus
        .filter((m) => !m.padreMenuId && !m.eliminado)
        .sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo)),
    [menus],
  )

  const childrenOf = (padreId: number) =>
    menus
      .filter((m) => m.padreMenuId === padreId && !m.eliminado)
      .sort((a, b) => a.orden - b.orden || a.titulo.localeCompare(b.titulo))

  if (roots.length === 0) {
    return <p className="text-muted small mb-0">Sin menús visibles. Crea uno con «Nuevo menú».</p>
  }

  return (
    <ul className="cq-admin-menu-tree list-unstyled mb-0" role="tree">
      {roots.map((node) => (
        <TreeNode
          key={node.menuId}
          node={node}
          childrenOf={childrenOf}
          selectedId={selectedId}
          searchQuery={searchQuery}
          onSelect={onSelect}
          onAddChild={onAddChild}
          depth={0}
          forceOpen={searchQuery.trim().length > 0}
        />
      ))}
    </ul>
  )
}

function TreeNode({
  node,
  childrenOf,
  selectedId,
  searchQuery,
  onSelect,
  onAddChild,
  depth,
  forceOpen,
}: {
  node: MenuAdminItem
  childrenOf: (id: number) => MenuAdminItem[]
  selectedId: number | null
  searchQuery: string
  onSelect: (menu: MenuAdminItem) => void
  onAddChild?: (parent: MenuAdminItem) => void
  depth: number
  forceOpen: boolean
}) {
  const children = childrenOf(node.menuId)
  const [open, setOpen] = useState(true)
  const expanded = forceOpen || open
  const hasChildren = children.length > 0
  const selected = selectedId === node.menuId
  const Icon = iconFromMenuKey(node.icono)
  const q = searchQuery.trim().toLowerCase()
  const highlight =
    q.length > 0 &&
    (node.titulo.toLowerCase().includes(q) ||
      (node.ruta?.toLowerCase().includes(q) ?? false) ||
      String(node.menuId).includes(q))

  return (
    <li role="treeitem" aria-expanded={hasChildren ? expanded : undefined} className="cq-admin-menu-tree-node">
      <div
        className={`cq-admin-menu-tree-row ${selected ? 'cq-admin-menu-tree-row--selected' : ''} ${
          highlight ? 'cq-admin-menu-tree-row--match' : ''
        }`}
        style={{ paddingLeft: `${depth * 1.1 + 0.35}rem` }}
      >
        {hasChildren ? (
          <button
            type="button"
            className="btn btn-link btn-sm cq-admin-menu-tree-toggle p-0"
            aria-label={expanded ? 'Contraer' : 'Expandir'}
            onClick={() => setOpen((v) => !v)}
          >
            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </button>
        ) : (
          <span className="cq-admin-menu-tree-toggle-spacer" aria-hidden />
        )}

        <button type="button" className="cq-admin-menu-tree-select btn btn-link text-left p-0" onClick={() => onSelect(node)}>
          <span className="cq-admin-menu-tree-icon" aria-hidden>
            <Icon className="h-4 w-4" />
          </span>
          <span className="cq-admin-menu-tree-text">
            <span className="cq-admin-menu-tree-title">{node.titulo}</span>
            {node.ruta ? <span className="cq-admin-menu-tree-meta">{node.ruta}</span> : null}
          </span>
        </button>

        {onAddChild ? (
          <button
            type="button"
            className="btn btn-link btn-sm cq-admin-menu-tree-add p-0"
            title={`Submenú bajo «${node.titulo}»`}
            aria-label={`Nuevo submenú bajo ${node.titulo}`}
            onClick={() => onAddChild(node)}
          >
            <Plus className="h-4 w-4" />
          </button>
        ) : null}
      </div>

      {hasChildren && expanded ? (
        <ul className="list-unstyled mb-0" role="group">
          {children.map((child) => (
            <TreeNode
              key={child.menuId}
              node={child}
              childrenOf={childrenOf}
              selectedId={selectedId}
              searchQuery={searchQuery}
              onSelect={onSelect}
              onAddChild={onAddChild}
              depth={depth + 1}
              forceOpen={forceOpen}
            />
          ))}
        </ul>
      ) : null}
    </li>
  )
}
