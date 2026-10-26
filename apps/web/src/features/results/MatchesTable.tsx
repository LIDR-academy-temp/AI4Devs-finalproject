import { useState } from 'react';
import { ApiError } from '@/api/client';
import { DataTable, type Column } from './DataTable';
import { EMPTY_FILTERS, FiltersBar, type FilterValues } from './FiltersBar';
import {
  PAGE_SIZE,
  useDecideMatch,
  useMatchList,
  useUndoMatch,
  type MatchStatus,
  type MatchView,
} from './api';
import { formatMoney } from './money';

const errorText = (e: unknown) =>
  e instanceof ApiError ? e.message : e ? 'No se pudo completar la acción' : null;

function Detail({ match }: { match: MatchView }) {
  return (
    <div className="flex flex-col gap-3 text-xs">
      <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
        <div>
          <dt className="text-muted-foreground">Método</dt>
          <dd>{match.method}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Confianza</dt>
          <dd>{match.confidence.toLocaleString('es-EC')}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Cardinalidad</dt>
          <dd>{match.cardinality}</dd>
        </div>
        <div>
          <dt className="text-muted-foreground">Diferencia</dt>
          <dd>{formatMoney(match.difference)}</dd>
        </div>
        <div className="col-span-2 sm:col-span-4">
          <dt className="text-muted-foreground">Explicación</dt>
          <dd>{match.explanation ?? '—'}</dd>
        </div>
        {match.createdBy && (
          <div>
            <dt className="text-muted-foreground">Creado por</dt>
            <dd>
              {match.createdBy} · {match.createdAt.slice(0, 16).replace('T', ' ')}
            </dd>
          </div>
        )}
        {match.confirmedBy && (
          <div>
            <dt className="text-muted-foreground">Confirmado por</dt>
            <dd>
              {match.confirmedBy} · {match.confirmedAt?.slice(0, 16).replace('T', ' ')}
            </dd>
          </div>
        )}
      </dl>
      <div>
        <p className="mb-1 font-medium">Ventas POS</p>
        <ul className="flex flex-col gap-0.5">
          {match.posTransactions.map((t) => (
            <li key={t.id}>
              {t.transactionAt.slice(0, 10)} · {formatMoney(t.amount)} · {t.storeCode ?? '—'} · lote{' '}
              {t.batchNumber ?? '—'} · ref {t.reference ?? '—'} · fila {t.rowNumber}
            </li>
          ))}
        </ul>
      </div>
      <div>
        <p className="mb-1 font-medium">Movimientos bancarios</p>
        <ul className="flex flex-col gap-0.5">
          {match.bankMovements.map((t) => (
            <li key={t.id}>
              {t.postedAt} · {formatMoney(t.amount)}
              {t.grossAmount ? ` (bruto ${formatMoney(t.grossAmount)})` : ''} · lote{' '}
              {t.batchNumber ?? '—'} · ref {t.reference ?? '—'} · fila {t.rowNumber}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}

interface Props {
  reconciliationId: string;
  version: string;
  status: MatchStatus;
  readOnly: boolean;
  /** Tolerancia de monto: por encima, confirmar una propuesta exige una nota. */
  tolerance: number;
}

/** Conciliadas (con Deshacer) y Propuestas (con Confirmar / Rechazar). */
export function MatchesTable({ reconciliationId, version, status, readOnly, tolerance }: Props) {
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const { data, isFetching } = useMatchList(reconciliationId, version, {
    status,
    method: filters.method,
    page,
    pageSize: PAGE_SIZE,
  });
  const decide = useDecideMatch(reconciliationId);
  const undo = useUndoMatch(reconciliationId);
  const [asking, setAsking] = useState<{ id: string; kind: 'undo' | 'confirm' } | null>(null);
  const [note, setNote] = useState('');

  const columns: Column<MatchView>[] = [
    { header: 'Método', render: (m) => m.method },
    { header: 'Cardinalidad', render: (m) => m.cardinality },
    { header: 'Ventas', render: (m) => m.posTransactions.length, className: 'text-right' },
    {
      header: 'Total POS',
      render: (m) => formatMoney(m.posTotal),
      className: 'text-right tabular-nums',
    },
    { header: 'Movs.', render: (m) => m.bankMovements.length, className: 'text-right' },
    {
      header: 'Total banco',
      render: (m) => formatMoney(m.bankTotal),
      className: 'text-right tabular-nums',
    },
    {
      header: 'Diferencia',
      render: (m) => formatMoney(m.difference),
      className: 'text-right tabular-nums',
    },
    { header: 'Confianza', render: (m) => m.confidence.toLocaleString('es-EC') },
  ];

  const needsNote = (m: MatchView) => Math.abs(Number(m.difference)) > tolerance;

  const actions = (m: MatchView) => {
    if (readOnly) return null;
    if (status === 'CONFIRMED') {
      return asking?.id === m.id && asking.kind === 'undo' ? (
        <span className="flex items-center gap-1 text-xs">
          ¿Deshacer este cruce?
          <button
            type="button"
            onClick={() => undo.mutate(m.id, { onSuccess: () => setAsking(null) })}
            disabled={undo.isPending}
            className="rounded-md border px-2 py-0.5"
          >
            Sí, deshacer
          </button>
          <button
            type="button"
            onClick={() => setAsking(null)}
            className="rounded-md border px-2 py-0.5"
          >
            No
          </button>
        </span>
      ) : (
        <button
          type="button"
          onClick={() => setAsking({ id: m.id, kind: 'undo' })}
          className="rounded-md border px-2 py-0.5 text-xs"
        >
          Deshacer
        </button>
      );
    }
    if (status === 'PROPOSED') {
      if (asking?.id === m.id && asking.kind === 'confirm') {
        return (
          <span className="flex items-center gap-1 text-xs">
            <input
              aria-label="Nota de confirmación"
              placeholder="Nota (obligatoria)"
              maxLength={500}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              className="rounded-md border bg-background px-1 py-0.5"
            />
            <button
              type="button"
              disabled={!note.trim() || decide.isPending}
              onClick={() =>
                decide.mutate(
                  { matchId: m.id, action: 'CONFIRM', note },
                  { onSuccess: () => setAsking(null) },
                )
              }
              className="rounded-md border px-2 py-0.5 disabled:opacity-50"
            >
              Confirmar
            </button>
            <button
              type="button"
              onClick={() => setAsking(null)}
              className="rounded-md border px-2 py-0.5"
            >
              Cancelar
            </button>
          </span>
        );
      }
      return (
        <span className="flex gap-1">
          <button
            type="button"
            disabled={decide.isPending}
            onClick={() => {
              setNote('');
              if (needsNote(m)) setAsking({ id: m.id, kind: 'confirm' });
              else decide.mutate({ matchId: m.id, action: 'CONFIRM' });
            }}
            className="rounded-md border px-2 py-0.5 text-xs"
          >
            Confirmar
          </button>
          <button
            type="button"
            disabled={decide.isPending}
            onClick={() => decide.mutate({ matchId: m.id, action: 'REJECT' })}
            className="rounded-md border px-2 py-0.5 text-xs"
          >
            Rechazar
          </button>
        </span>
      );
    }
    return null;
  };

  const error = errorText(undo.error) ?? errorText(decide.error);

  return (
    <div className="flex flex-col gap-3">
      <FiltersBar
        values={filters}
        onChange={(v) => {
          setFilters(v);
          setPage(1);
        }}
        show={{ method: status === 'CONFIRMED' }}
      />
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <DataTable
        label={status === 'CONFIRMED' ? 'Cruces conciliados' : 'Cruces propuestos'}
        columns={columns}
        rows={data?.items ?? []}
        total={data?.total ?? 0}
        page={page}
        pageSize={PAGE_SIZE}
        onPage={setPage}
        loading={isFetching}
        empty={
          status === 'CONFIRMED' ? 'Aún no hay cruces conciliados' : 'No hay propuestas por revisar'
        }
        detail={(m) => <Detail match={m} />}
        actions={actions}
      />
    </div>
  );
}
