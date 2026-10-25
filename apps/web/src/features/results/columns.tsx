import type { Column } from './DataTable';
import type { BankTx, PosTx } from './api';
import { formatMoney } from './money';

const day = (value: string | null) => (value ? value.slice(0, 10) : '—');
const dash = (value: string | null) => value ?? '—';

export const posColumns: Column<PosTx>[] = [
  { header: 'Fecha', render: (t) => day(t.transactionAt) },
  { header: 'Local', render: (t) => dash(t.storeCode) },
  { header: 'Monto', render: (t) => formatMoney(t.amount), className: 'text-right tabular-nums' },
  { header: 'Marca', render: (t) => dash(t.cardBrand) },
  { header: 'Últ. 4', render: (t) => dash(t.cardLast4) },
  { header: 'Autorización', render: (t) => dash(t.authCode) },
  { header: 'Lote', render: (t) => dash(t.batchNumber) },
  { header: 'Referencia', render: (t) => dash(t.reference) },
];

export const bankColumns: Column<BankTx>[] = [
  { header: 'Fecha', render: (t) => day(t.postedAt) },
  { header: 'Local', render: (t) => dash(t.storeCode) },
  { header: 'Monto', render: (t) => formatMoney(t.amount), className: 'text-right tabular-nums' },
  {
    header: 'Bruto',
    render: (t) => formatMoney(t.grossAmount),
    className: 'text-right tabular-nums',
  },
  { header: 'Últ. 4', render: (t) => dash(t.cardLast4) },
  { header: 'Autorización', render: (t) => dash(t.authCode) },
  { header: 'Lote', render: (t) => dash(t.batchNumber) },
  { header: 'Referencia', render: (t) => dash(t.reference) },
];

/** Fila original del archivo, para el detalle expandible. */
export function RawRow({ row, rowNumber }: { row: Record<string, unknown>; rowNumber: number }) {
  return (
    <div className="text-xs">
      <p className="mb-1 font-medium">Fila {rowNumber} del archivo original</p>
      <dl className="grid grid-cols-2 gap-x-4 gap-y-0.5 sm:grid-cols-4">
        {Object.entries(row).map(([k, v]) => (
          <div key={k}>
            <dt className="text-muted-foreground">{k}</dt>
            <dd>{v === null || v === undefined || v === '' ? '—' : String(v)}</dd>
          </div>
        ))}
      </dl>
    </div>
  );
}
