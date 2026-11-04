import type { ReactNode } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
} from 'chart.js'
import type { ChartOptions } from 'chart.js'
import { Line, Bar } from 'react-chartjs-2'
import { formatMxn } from '../finanzas/format'
import { formatBiPeriodLabel, morosidadPct } from './biTrendsUtils'
import type { BiKpiSnapshot } from './reportesAdmin.api'

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
  Tooltip,
  Legend,
  Filler,
)

type Props = { snapshots: BiKpiSnapshot[] }

const gridColor = 'rgba(148, 163, 184, 0.25)'
const textMuted = '#64748b'

const baseCartesian: ChartOptions<'line' | 'bar'> = {
  responsive: true,
  maintainAspectRatio: false,
  interaction: { mode: 'index', intersect: false },
  plugins: {
    legend: {
      position: 'bottom',
      labels: { boxWidth: 12, padding: 16, color: textMuted, font: { size: 11 } },
    },
    tooltip: {
      backgroundColor: 'rgba(15, 23, 42, 0.92)',
      padding: 10,
      cornerRadius: 8,
    },
  },
  scales: {
    x: {
      grid: { display: false },
      ticks: { color: textMuted, maxRotation: 45, minRotation: 0, font: { size: 11 } },
    },
  },
}

function ChartCard({
  icon,
  title,
  subtitle,
  children,
}: {
  icon: string
  title: string
  subtitle?: string
  children: ReactNode
}) {
  return (
    <div className="card cq-admin-card cq-bi-chart-card h-100">
      <div className="card-body d-flex flex-column">
        <div className="d-flex align-items-start gap-2 mb-3">
          <span className="cq-bi-chart-icon" aria-hidden="true">
            <i className={`mdi ${icon}`} />
          </span>
          <div>
            <h3 className="h6 mb-0">{title}</h3>
            {subtitle ? <p className="text-muted small mb-0 mt-1">{subtitle}</p> : null}
          </div>
        </div>
        <div className="cq-bi-chart-canvas flex-grow-1">{children}</div>
      </div>
    </div>
  )
}

export function BiTendenciasCharts({ snapshots }: Props) {
  if (snapshots.length === 0) {
    return (
      <div className="card cq-admin-card">
        <div className="card-body cq-bi-empty text-center py-5 px-4">
          <div className="cq-bi-empty-icon mx-auto mb-3" aria-hidden="true">
            <i className="mdi mdi-chart-line" />
          </div>
          <p className="fw-semibold mb-2">Sin datos de tendencias</p>
          <p className="text-muted small mb-0 mx-auto" style={{ maxWidth: '28rem' }}>
            El worker crea snapshots diarios. Pulsa <strong>Actualizar</strong> para generar el de hoy o carga datos
            demo con el script SQL del ticket BI-RPT-001.
          </p>
        </div>
      </div>
    )
  }

  const labels = snapshots.map((s) => formatBiPeriodLabel(s.fecha))

  const ticketsData = {
    labels,
    datasets: [
      {
        label: 'Abiertos',
        data: snapshots.map((s) => s.ticketsAbiertos),
        borderColor: '#274c77',
        backgroundColor: 'rgba(39, 76, 119, 0.12)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4,
        pointHoverRadius: 6,
      },
      {
        label: 'Tiempo resolución (h)',
        data: snapshots.map((s) => s.tiempoMedioResolucionHoras),
        borderColor: '#e07a5f',
        backgroundColor: 'transparent',
        borderDash: [6, 4],
        tension: 0.35,
        borderWidth: 2,
        yAxisID: 'y1',
        pointRadius: 3,
      },
    ],
  }

  const finanzasData = {
    labels,
    datasets: [
      {
        label: 'Ingresos',
        data: snapshots.map((s) => s.ingresosMXN),
        backgroundColor: 'rgba(22, 163, 74, 0.75)',
        borderRadius: 6,
        maxBarThickness: 48,
      },
      {
        label: 'Egresos',
        data: snapshots.map((s) => s.egresosMXN),
        backgroundColor: 'rgba(220, 38, 38, 0.65)',
        borderRadius: 6,
        maxBarThickness: 48,
      },
    ],
  }

  const morosidadData = {
    labels,
    datasets: [
      {
        label: '% morosidad',
        data: snapshots.map(morosidadPct),
        borderColor: '#7c3aed',
        backgroundColor: 'rgba(124, 58, 237, 0.15)',
        fill: true,
        tension: 0.35,
        borderWidth: 2,
        pointRadius: 4,
      },
    ],
  }

  return (
    <div className="row g-3">
      <div className="col-lg-6">
        <ChartCard icon="mdi-ticket-outline" title="Tickets" subtitle="Abiertos vs tiempo medio de resolución">
          <Line
            data={ticketsData}
            options={{
              ...baseCartesian,
              scales: {
                ...baseCartesian.scales,
                y: {
                  beginAtZero: true,
                  grid: { color: gridColor },
                  ticks: { color: textMuted, precision: 0 },
                  title: { display: true, text: 'Tickets', color: textMuted, font: { size: 10 } },
                },
                y1: {
                  position: 'right',
                  beginAtZero: true,
                  grid: { drawOnChartArea: false },
                  ticks: { color: textMuted },
                  title: { display: true, text: 'Horas', color: textMuted, font: { size: 10 } },
                },
              },
            }}
          />
        </ChartCard>
      </div>
      <div className="col-lg-6">
        <ChartCard icon="mdi-cash-multiple" title="Flujo financiero" subtitle="Acumulado del mes por snapshot">
          <Bar
            data={finanzasData}
            options={{
              ...baseCartesian,
              plugins: {
                ...baseCartesian.plugins,
                tooltip: {
                  ...baseCartesian.plugins?.tooltip,
                  callbacks: {
                    label: (ctx) => {
                      const v = ctx.parsed.y
                      return `${ctx.dataset.label}: ${formatMxn(v ?? 0)}`
                    },
                  },
                },
              },
              scales: {
                ...baseCartesian.scales,
                y: {
                  beginAtZero: true,
                  grid: { color: gridColor },
                  ticks: {
                    color: textMuted,
                    callback: (v) => formatMxn(Number(v)),
                  },
                },
              },
            }}
          />
        </ChartCard>
      </div>
      <div className="col-12">
        <ChartCard
          icon="mdi-home-alert-outline"
          title="Morosidad"
          subtitle="Residentes morosos sobre casas ocupadas (%)"
        >
          <Line
            data={morosidadData}
            options={{
              ...baseCartesian,
              scales: {
                ...baseCartesian.scales,
                y: {
                  beginAtZero: true,
                  max: 100,
                  grid: { color: gridColor },
                  ticks: { color: textMuted, callback: (v) => `${v}%` },
                },
              },
            }}
          />
        </ChartCard>
      </div>
    </div>
  )
}
