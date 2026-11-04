import { CuotasResidentList } from '../features/finanzas/CuotasResidentList'
import { formatMxn } from '../features/finanzas/format'
import { useEstadoCuenta } from '../features/finanzas/useEstadoCuenta'
import {
  PortalListPage,
  PortalListSection,
  PortalStat,
  PortalStatStrip,
  portalListCountDescription,
} from '../shared/components/admin'
import { useQueryErrorToast } from '../shared/hooks/useQueryErrorToast'

export function EstadoCuentaPage() {
  const { data, loading, error, refetch } = useEstadoCuenta()
  useQueryErrorToast(error)

  const count = data?.cuotas.length ?? 0

  return (
    <PortalListPage
      width="4xl"
      backLink={{ to: '/', label: '← Inicio' }}
      header={{
        title: 'Mi estado de cuenta',
        description: portalListCountDescription(
          count,
          'cuota',
          'cuotas',
          'Cuotas pendientes, vencidas y pagadas de tu vivienda.',
        ),
      }}
      loading={loading}
      loadingMessage="Cargando cuotas…"
      error={error}
      onRetry={() => void refetch()}
      empty={
        !loading && !error && data && count === 0
          ? { title: 'No tienes cuotas registradas.', description: 'Cuando se generen aparecerán aquí.' }
          : undefined
      }
    >
      {data && count > 0 ? (
        <>
          <PortalStatStrip className="cq-portal-finanzas-resumen">
            <PortalStat
              label="Total pendiente"
              value={formatMxn(data.totalPendiente)}
              valueClassName="text-warning"
            />
            <PortalStat
              label="Total vencido"
              value={formatMxn(data.totalVencido)}
              valueClassName="text-danger"
            />
          </PortalStatStrip>
          <PortalListSection title="Listado">
            <CuotasResidentList cuotas={data.cuotas} />
          </PortalListSection>
        </>
      ) : null}
    </PortalListPage>
  )
}
