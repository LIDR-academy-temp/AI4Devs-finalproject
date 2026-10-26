import { formatMoney } from './money';
import type { Summary } from './api';

function Card({ label, value, hint }: { label: string; value: string; hint?: string }) {
  return (
    <div className="rounded-lg border bg-card p-3">
      <dt className="text-xs text-muted-foreground">{label}</dt>
      <dd className="text-xl font-semibold">{value}</dd>
      {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
    </div>
  );
}

/** Indicadores principales; con una conciliación sin ejecutar los de cruce salen en cero. */
export function KpiCards({ summary }: { summary: Summary }) {
  const matchedPct = `${summary.matchedPercent.toLocaleString('es-EC')} %`;
  return (
    <dl aria-label="Indicadores" className="grid grid-cols-2 gap-3 md:grid-cols-4">
      <Card
        label="Ventas POS"
        value={String(summary.posCount)}
        hint={`Total ${formatMoney(summary.posTotal)}`}
      />
      <Card
        label="Movimientos bancarios"
        value={String(summary.bankCount)}
        hint={`Total ${formatMoney(summary.bankTotal)}`}
      />
      <Card
        label="Conciliado"
        value={matchedPct}
        hint={`${summary.matchedPos} ventas · ${summary.matchedBank} movimientos`}
      />
      <Card label="Diferencia total" value={formatMoney(summary.totalDifference)} />
      <Card
        label="Pendientes POS"
        value={String(summary.pendingPos)}
        hint={formatMoney(summary.pendingPosTotal)}
      />
      <Card
        label="Pendientes banco"
        value={String(summary.pendingBank)}
        hint={formatMoney(summary.pendingBankTotal)}
      />
      <Card label="Propuestas" value={String(summary.proposed)} />
      <Card label="Excepciones" value={String(summary.exceptions)} />
    </dl>
  );
}
