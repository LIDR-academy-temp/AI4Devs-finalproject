import { describe, expect, it } from 'vitest'

const epicPageModules = import.meta.glob('../../pages/{Notificaciones,AdminReportes,BotIntegracionAdmin}Page.tsx')
const epicRouteModules = import.meta.glob('../components/TrabajadorRoute.tsx')

/**
 * TC-NAV-04 … TC-NAV-07 — pantallas/rutas epic (ROJO hasta /ejecutar fases B–F).
 */
// TC-NAV-06/07 en skip: fases E (Reportes/BI) y F (integración BOT) de NAV-ROOT-001
// siguen pendientes (ver .planning/tkt-nav-root-001/_index.md). Quitar skip al ejecutarlas.
describe('NAV-ROOT-001 pages and routes', () => {
  it('TC-NAV-04 NotificacionesPage existe', () => {
    expect(epicPageModules['../../pages/NotificacionesPage.tsx']).toBeDefined()
  })

  it('TC-NAV-05 TrabajadorRoute existe', () => {
    expect(epicRouteModules['../components/TrabajadorRoute.tsx']).toBeDefined()
  })

  it.skip('TC-NAV-06 AdminReportesPage existe', () => {
    expect(epicPageModules['../../pages/AdminReportesPage.tsx']).toBeDefined()
  })

  it.skip('TC-NAV-07 BotIntegracionAdminPage existe', () => {
    expect(epicPageModules['../../pages/BotIntegracionAdminPage.tsx']).toBeDefined()
  })
})
