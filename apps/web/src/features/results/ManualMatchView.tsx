import { useState } from 'react';
import { ApiError } from '@/api/client';
import { DataTable } from './DataTable';
import { EMPTY_FILTERS, FiltersBar, type FilterValues } from './FiltersBar';
import {
  PAGE_SIZE,
  useBankList,
  useCreateManualMatch,
  usePosList,
  type BankTx,
  type PosTx,
} from './api';
import { bankColumns, posColumns } from './columns';
import { formatCents, sumCents } from './money';

export const MAX_NOTE = 500;

/** Barra con la suma de cada lado y la diferencia (banco − POS). */
export function DifferenceBar({
  posAmounts,
  bankAmounts,
}: {
  posAmounts: string[];
  bankAmounts: string[];
}) {
  const pos = sumCents(posAmounts);
  const bank = sumCents(bankAmounts);
  const diff = bank - pos;
  return (
    <div
      role="status"
      aria-label="Diferencia"
      className="sticky bottom-0 flex flex-wrap items-center justify-between gap-4 rounded-lg border bg-card p-3 text-sm"
    >
      <span>
        POS ({posAmounts.length}): <strong className="tabular-nums">{formatCents(pos)}</strong>
      </span>
      <span>
        Banco ({bankAmounts.length}): <strong className="tabular-nums">{formatCents(bank)}</strong>
      </span>
      <span className={diff === 0 ? '' : 'text-amber-700'}>
        Diferencia: <strong className="tabular-nums">{formatCents(diff)}</strong>
      </span>
    </div>
  );
}

function useSelection<T extends { id: string; amount: string }>() {
  const [selected, setSelected] = useState<Map<string, string>>(new Map());
  const toggle = (row: T) =>
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(row.id)) next.delete(row.id);
      else next.set(row.id, row.amount);
      return next;
    });
  return { selected, toggle, clear: () => setSelected(new Map()) };
}

interface Props {
  reconciliationId: string;
  version: string;
}

export function ManualMatchView({ reconciliationId, version }: Props) {
  const [posFilters, setPosFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [bankFilters, setBankFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [posPage, setPosPage] = useState(1);
  const [bankPage, setBankPage] = useState(1);
  const posSel = useSelection<PosTx>();
  const bankSel = useSelection<BankTx>();
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const create = useCreateManualMatch(reconciliationId);

  const toQuery = (f: FilterValues, page: number, brand: boolean) => ({
    status: 'PENDING' as const,
    dateFrom: f.dateFrom,
    dateTo: f.dateTo,
    amountMin: f.amountMin,
    amountMax: f.amountMax,
    brand: brand ? f.brand : '',
    page,
    pageSize: PAGE_SIZE,
  });
  const pos = usePosList(reconciliationId, version, toQuery(posFilters, posPage, true));
  const bank = useBankList(reconciliationId, version, toQuery(bankFilters, bankPage, false));

  const posAmounts = [...posSel.selected.values()];
  const bankAmounts = [...bankSel.selected.values()];
  const diff = sumCents(bankAmounts) - sumCents(posAmounts);
  const canCreate = posAmounts.length > 0 && bankAmounts.length > 0 && !create.isPending;

  function submit() {
    create.mutate(
      {
        posIds: [...posSel.selected.keys()],
        bankIds: [...bankSel.selected.keys()],
        note: note.trim() || undefined,
      },
      {
        onSuccess: () => {
          posSel.clear();
          bankSel.clear();
          setNote('');
          setConfirming(false);
        },
        onError: () => setConfirming(false),
      },
    );
  }

  const error =
    create.error instanceof ApiError
      ? create.error.message
      : create.error
        ? 'No se pudo crear el cruce'
        : null;

  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground">
        Selecciona ventas y movimientos pendientes (puedes cambiar de página y filtrar sin perder la
        selección) para crear un cruce manual.
      </p>
      <div className="grid gap-4 lg:grid-cols-2">
        <section aria-label="Ventas pendientes" className="flex min-w-0 flex-col gap-2">
          <h3 className="text-sm font-medium">Ventas POS pendientes</h3>
          <FiltersBar
            values={posFilters}
            onChange={(v) => {
              setPosFilters(v);
              setPosPage(1);
            }}
            show={{ dates: true, amount: true, brand: true }}
          />
          <DataTable<PosTx>
            label="Ventas pendientes para cruzar"
            columns={posColumns.slice(0, 5)}
            rows={pos.data?.items ?? []}
            total={pos.data?.total ?? 0}
            page={posPage}
            pageSize={PAGE_SIZE}
            onPage={setPosPage}
            loading={pos.isFetching}
            empty="No hay ventas pendientes"
            selected={new Set(posSel.selected.keys())}
            onToggle={posSel.toggle}
          />
        </section>
        <section aria-label="Movimientos pendientes" className="flex min-w-0 flex-col gap-2">
          <h3 className="text-sm font-medium">Movimientos bancarios pendientes</h3>
          <FiltersBar
            values={bankFilters}
            onChange={(v) => {
              setBankFilters(v);
              setBankPage(1);
            }}
            show={{ dates: true, amount: true }}
          />
          <DataTable<BankTx>
            label="Movimientos pendientes para cruzar"
            columns={bankColumns.slice(0, 5)}
            rows={bank.data?.items ?? []}
            total={bank.data?.total ?? 0}
            page={bankPage}
            pageSize={PAGE_SIZE}
            onPage={setBankPage}
            loading={bank.isFetching}
            empty="No hay movimientos pendientes"
            selected={new Set(bankSel.selected.keys())}
            onToggle={bankSel.toggle}
          />
        </section>
      </div>

      <DifferenceBar posAmounts={posAmounts} bankAmounts={bankAmounts} />

      <label className="flex flex-col gap-1 text-sm">
        Nota (opcional)
        <textarea
          value={note}
          maxLength={MAX_NOTE}
          onChange={(e) => setNote(e.target.value)}
          rows={2}
          className="rounded-md border bg-background px-2 py-1"
        />
        <span className="text-xs text-muted-foreground">
          {note.length} / {MAX_NOTE}
        </span>
      </label>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      {confirming ? (
        <div
          role="dialog"
          aria-label="Confirmar cruce con diferencia"
          className="rounded-md border p-3 text-sm"
        >
          <p>
            Las sumas no coinciden: la diferencia es <strong>{formatCents(diff)}</strong>. ¿Crear el
            cruce de todas formas?
          </p>
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={submit}
              disabled={create.isPending}
              className="rounded-md bg-primary px-3 py-1 text-primary-foreground"
            >
              Crear con diferencia
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              className="rounded-md border px-3 py-1"
            >
              Cancelar
            </button>
          </div>
        </div>
      ) : (
        <div>
          <button
            type="button"
            disabled={!canCreate}
            onClick={() => (diff === 0 ? submit() : setConfirming(true))}
            className="rounded-md bg-primary px-3 py-1 text-sm text-primary-foreground disabled:opacity-50"
          >
            Crear cruce manual
          </button>
        </div>
      )}
    </div>
  );
}
