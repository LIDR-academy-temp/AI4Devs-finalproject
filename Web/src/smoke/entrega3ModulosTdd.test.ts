import { describe, expect, it } from 'vitest'

/**
 * Gate Entrega 3: cada dominio Web in-scope debe tener al menos un archivo Vitest.
 * Excluido: bot-ia (v2).
 */
const testFiles = Object.keys(
  import.meta.glob('../**/*.{test,spec}.{ts,tsx}', { eager: false }),
)

const MODULOS: { id: string; patterns: RegExp[] }[] = [
  {
    id: 'SGR',
    patterns: [
      /LoginPage\.test/,
      /AdminUsuariosPage\.test/,
      /AdminCasasPage\.test/,
      /AdminMenusPage\.test/,
      /AdminPerfilesPage\.test/,
      /features\/navegacion\//,
      /CambiarPasswordPage\.test/,
    ],
  },
  {
    id: 'TKT',
    patterns: [
      /TicketsPage\.test/,
      /NuevoTicketPage\.test/,
      /TicketDetallePage\.test/,
      /AdminTicketsPage\.test/,
      /features\/tickets\//,
    ],
  },
  {
    id: 'FNZ',
    patterns: [/EstadoCuentaPage\.test/, /FinanzasAdminPage\.test/, /features\/finanzas\//, /features\/admin\/finanzas\//],
  },
  { id: 'ANM', patterns: [/AnunciosPage\.test/, /AdminAnunciosPage\.test/, /features\/anuncios\//] },
  { id: 'ENC', patterns: [/EncuestasPage\.test/, /EncuestaDetallePage\.test/, /AdminEncuestasPage\.test/, /features\/encuestas\//] },
  { id: 'JNT', patterns: [/JuntasPage\.test/, /JuntaDetallePage\.test/, /AdminJuntasPage\.test/] },
  {
    id: 'VTS',
    patterns: [
      /AreasYReservacionesPage\.test/,
      /AdminVisitasPage\.test/,
      /features\/visitas\//,
      /ValidarPasePage\.test/,
      /MisPasesVisitaPage\.test/,
    ],
  },
  { id: 'USR', patterns: [/MisVehiculosPage\.test/, /MisMascotasPage\.test/, /AdminVehiculosPage\.test/, /AdminMascotasPage\.test/] },
  { id: 'ARC', patterns: [/ArchivosPage\.test/, /AdminArchivosPage\.test/, /features\/archivos\//] },
  { id: 'WMS', patterns: [/AdminAlmacenPage\.test/, /features\/almacen\//] },
  {
    id: 'NTF',
    patterns: [/NotificacionesPage\.test/, /AdminAvisoNotificacionPage\.test/, /features\/notifications\//],
  },
  { id: 'Dashboard', patterns: [/HomePage\.test/, /features\/dashboard\//] },
  {
    id: 'BI/RPT',
    patterns: [/features\/reportes\//, /AdminReportesPage\.test/, /biTrendsUtils\.test/],
  },
  { id: 'Trabajador', patterns: [/TrabajadorRoute\.test/, /TrabajadorTicketsPage\.test/] },
  { id: 'Shell', patterns: [/AppShell\.test/, /PortalPageLayout\.test/, /PerfilPage\.test/] },
]

function moduloCubierto(patterns: RegExp[]): boolean {
  return testFiles.some((path) => patterns.some((re) => re.test(path.replace(/\\/g, '/'))))
}

describe('Entrega 3 — cobertura TDD por módulo (Web)', () => {
  it.each(MODULOS)('módulo $id tiene tests Vitest', ({ id, patterns }) => {
    expect(moduloCubierto(patterns), `sin tests para módulo ${id}`).toBe(true)
  })
})
