import { readFileSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { describe, expect, it } from 'vitest'
import { DB_008_CLAVES, manifestClaveSet } from './navCatalog.manifest'

const DB008_SQL = resolve(
  import.meta.dirname,
  '../../../../SQL/DB-008_sgr_menus_nav_root.sql',
)

/**
 * TC-NAV-02 — Claves DB-008 ⊆ manifest (design.md).
 */
describe('TC-NAV-02 DB-008 claves', () => {
  it('DB_008_CLAVES esta definido en manifest y no vacio', () => {
    expect(DB_008_CLAVES.length).toBeGreaterThan(0)
  })

  it('cada clave DB_008 existe en NAV_CATALOG_NODES', () => {
    const manifest = manifestClaveSet()
    const missing = DB_008_CLAVES.filter((c) => !manifest.has(c))
    expect(missing, `claves huérfanas: ${missing.join(', ')}`).toEqual([])
  })

  it('script DB-008_sgr_menus_nav_root.sql existe y menciona claves nuevas epic', () => {
    expect(existsSync(DB008_SQL), DB008_SQL).toBe(true)
    const sql = readFileSync(DB008_SQL, 'utf8')
    for (const clave of ['visitas-pases', 'admin-reportes', 'trabajador-tickets']) {
      expect(sql, clave).toContain(`N'${clave}'`)
    }
  })
})
