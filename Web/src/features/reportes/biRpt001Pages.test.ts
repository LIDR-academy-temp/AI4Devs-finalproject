import { describe, expect, it } from 'vitest'

const reportesPages = import.meta.glob('../../pages/AdminReportesPage.tsx')
const avisoPages = import.meta.glob('../../pages/AdminAvisoNotificacionPage.tsx')

/**
 * TC-BIRPT-01 / TC-NAV-06 — pantallas BI-RPT-001 (ROJO hasta /ejecutar).
 */
describe('BI-RPT-001 pages (TC-BIRPT-01)', () => {
  it('AdminReportesPage existe', () => {
    expect(reportesPages['../../pages/AdminReportesPage.tsx']).toBeDefined()
  })

  it('AdminAvisoNotificacionPage existe (fase G)', () => {
    expect(avisoPages['../../pages/AdminAvisoNotificacionPage.tsx']).toBeDefined()
  })
})
