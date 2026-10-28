import { describe, expect, it } from 'vitest'
import { APP_NAV, navGroupsForPerfil } from './appNavigation'
import { NAV_CATALOG_NODES } from './navCatalog.manifest'

/**
 * TC-NAV-01 — Paridad manifest ↔ APP_NAV (design.md).
 * Expected: cada nodo implemented con path debe existir en APP_NAV con mismo path, label y order;
 * cada ítem APP_NAV debe tener entrada en manifest por path.
 */
describe('TC-NAV-01 nav catalog parity', () => {
  it('manifest implemented paths existen en APP_NAV con label y order', () => {
    const appByPath = new Map(APP_NAV.map((item) => [item.path, item]))
    const mismatches: string[] = []

    for (const node of NAV_CATALOG_NODES) {
      if (!node.implemented || !node.path) continue
      const item = appByPath.get(node.path)
      if (!item) {
        mismatches.push(`falta APP_NAV: ${node.path} (${node.clave})`)
        continue
      }
      if (item.label !== node.label) {
        mismatches.push(`label ${node.path}: manifest="${node.label}" app="${item.label}"`)
      }
      if (item.order !== node.order) {
        mismatches.push(`order ${node.path}: manifest=${node.order} app=${item.order}`)
      }
      if (item.group !== node.groupKey) {
        mismatches.push(
          `group ${node.path}: manifest="${node.groupKey}" app="${item.group}"`,
        )
      }
    }

    expect(mismatches, mismatches.join('\n')).toEqual([])
  })

  it('cada APP_NAV tiene nodo manifest por path', () => {
    const manifestPaths = new Set(
      NAV_CATALOG_NODES.filter((n) => n.path).map((n) => n.path as string),
    )
    const orphan = APP_NAV.filter((item) => !manifestPaths.has(item.path)).map((i) => i.path)
    expect(orphan, `paths sin manifest: ${orphan.join(', ')}`).toEqual([])
  })

  it('navGroupsForPerfil incluye grupos de items cross-profile (Admin)', () => {
    const groups = navGroupsForPerfil('Administrador')
    expect(groups.some((g) => g.key === 'mi-cuenta')).toBe(true)
  })
})
