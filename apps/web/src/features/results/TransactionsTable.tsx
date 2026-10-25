import { useState } from 'react';
import { DataTable } from './DataTable';
import { EMPTY_FILTERS, FiltersBar, type FilterValues } from './FiltersBar';
import { PAGE_SIZE, useBankList, usePosList, type BankTx, type PosTx, type TxStatus } from './api';
import { RawRow, bankColumns, posColumns } from './columns';

interface Props {
  reconciliationId: string;
  version: string;
  source: 'POS' | 'BANK';
  status: TxStatus;
}

/** Listado paginado de ventas o movimientos de un estado, con filtros y fila original. */
export function TransactionsTable({ reconciliationId, version, source, status }: Props) {
  const [filters, setFilters] = useState<FilterValues>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const query = {
    status,
    dateFrom: filters.dateFrom,
    dateTo: filters.dateTo,
    amountMin: filters.amountMin,
    amountMax: filters.amountMax,
    brand: source === 'POS' ? filters.brand : '',
    page,
    pageSize: PAGE_SIZE,
  };
  const pos = usePosList(reconciliationId, version, query, source === 'POS');
  const bank = useBankList(reconciliationId, version, query, source === 'BANK');
  const result = source === 'POS' ? pos : bank;
  const onFilters = (v: FilterValues) => {
    setFilters(v);
    setPage(1);
  };
  const empty = 'No hay elementos con estos filtros';

  return (
    <div className="flex flex-col gap-3">
      <FiltersBar
        values={filters}
        onChange={onFilters}
        show={{ dates: true, amount: true, brand: source === 'POS' }}
      />
      {source === 'POS' ? (
        <DataTable<PosTx>
          label="Ventas POS"
          columns={posColumns}
          rows={pos.data?.items ?? []}
          total={pos.data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          loading={result.isFetching}
          empty={empty}
          detail={(t) => <RawRow row={t.rawData} rowNumber={t.rowNumber} />}
        />
      ) : (
        <DataTable<BankTx>
          label="Movimientos bancarios"
          columns={bankColumns}
          rows={bank.data?.items ?? []}
          total={bank.data?.total ?? 0}
          page={page}
          pageSize={PAGE_SIZE}
          onPage={setPage}
          loading={result.isFetching}
          empty={empty}
          detail={(t) => <RawRow row={t.rawData} rowNumber={t.rowNumber} />}
        />
      )}
    </div>
  );
}
