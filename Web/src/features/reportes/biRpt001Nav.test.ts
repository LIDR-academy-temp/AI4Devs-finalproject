import { describe, expect, it } from 'vitest'
import { NAV_CATALOG_NODES } from '../../shared/navigation/navCatalog.manifest'

/**
 * TC-BIRPT-02 — flags manifest BI-RPT-001 (ROJO hasta /ejecutar).
 */
describe('BI-RPT-001 manifest (TC-BIRPT-02)', () => {
  const byClave = (clave: string) => NAV_CATALOG_NODES.find((n) => n.clave === clave)

  it('admin-reportes y admin-ntf-aviso implemented:true; admin-bot false', () => {
    expect(byClave('admin-reportes')?.implemented).toBe(true)
    expect(byClave('admin-ntf-aviso')?.implemented).toBe(true)
    expect(byClave('admin-bot')?.implemented).toBe(false)
  })
})
