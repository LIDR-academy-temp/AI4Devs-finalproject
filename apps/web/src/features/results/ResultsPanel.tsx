import { useState } from 'react';
import { KpiCards } from './KpiCards';
import { ManualMatchView } from './ManualMatchView';
import { MatchesTable } from './MatchesTable';
import { TransactionsTable } from './TransactionsTable';
import { useSummary } from './api';

type TabId = 'matched' | 'pendingPos' | 'pendingBank' | 'proposed' | 'exceptions' | 'manual';

interface Props {
  reconciliationId: string;
  /** Cambia al terminar una ejecución para refrescar todo. */
  version: string;
  readOnly: boolean;
  tolerance: number;
}

export function ResultsPanel({ reconciliationId, version, readOnly, tolerance }: Props) {
  const [tab, setTab] = useState<TabId>('matched');
  const { data: summary } = useSummary(reconciliationId, version);
  if (!summary) return <p className="text-sm text-muted-foreground">Cargando resultados…</p>;

  const matched = Object.values(summary.matchedByMethod).reduce((a, b) => a + b, 0);
  const tabs: { id: TabId; label: string; count?: number }[] = [
    { id: 'matched', label: 'Conciliadas', count: matched },
    { id: 'pendingPos', label: 'Pendientes POS', count: summary.pendingPos },
    { id: 'pendingBank', label: 'Pendientes banco', count: summary.pendingBank },
    { id: 'proposed', label: 'Propuestas', count: summary.proposed },
    { id: 'exceptions', label: 'Excepciones', count: summary.exceptions },
    ...(readOnly ? [] : [{ id: 'manual' as const, label: 'Cruce manual' }]),
  ];

  return (
    <div className="flex flex-col gap-4">
      <KpiCards summary={summary} />
      <div role="tablist" aria-label="Resultados" className="flex flex-wrap gap-1 border-b">
        {tabs.map((t) => (
          <button
            key={t.id}
            type="button"
            role="tab"
            id={`tab-${t.id}`}
            aria-selected={tab === t.id}
            aria-controls={`panel-${t.id}`}
            onClick={() => setTab(t.id)}
            className={`-mb-px rounded-t-md border px-3 py-1.5 text-sm ${
              tab === t.id
                ? 'border-b-background bg-card font-medium'
                : 'border-transparent text-muted-foreground'
            }`}
          >
            {t.label}
            {t.count !== undefined && ` (${t.count})`}
          </button>
        ))}
      </div>
      <div role="tabpanel" id={`panel-${tab}`} aria-labelledby={`tab-${tab}`}>
        {tab === 'matched' && (
          <MatchesTable
            reconciliationId={reconciliationId}
            version={version}
            status="CONFIRMED"
            readOnly={readOnly}
            tolerance={tolerance}
          />
        )}
        {tab === 'proposed' && (
          <MatchesTable
            reconciliationId={reconciliationId}
            version={version}
            status="PROPOSED"
            readOnly={readOnly}
            tolerance={tolerance}
          />
        )}
        {tab === 'pendingPos' && (
          <TransactionsTable
            reconciliationId={reconciliationId}
            version={version}
            source="POS"
            status="PENDING"
          />
        )}
        {tab === 'pendingBank' && (
          <TransactionsTable
            reconciliationId={reconciliationId}
            version={version}
            source="BANK"
            status="PENDING"
          />
        )}
        {tab === 'exceptions' && (
          <div className="flex flex-col gap-6">
            <TransactionsTable
              reconciliationId={reconciliationId}
              version={version}
              source="POS"
              status="EXCEPTION"
            />
            <TransactionsTable
              reconciliationId={reconciliationId}
              version={version}
              source="BANK"
              status="EXCEPTION"
            />
          </div>
        )}
        {tab === 'manual' && (
          <ManualMatchView reconciliationId={reconciliationId} version={version} />
        )}
      </div>
    </div>
  );
}
