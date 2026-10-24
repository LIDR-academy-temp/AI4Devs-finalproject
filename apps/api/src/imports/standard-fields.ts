import type { SourceType } from '../generated/prisma/client.js';

export interface StandardFieldDef {
  field: string;
  label: string;
  required: boolean;
}

export const POS_FIELDS: readonly StandardFieldDef[] = [
  { field: 'transactionAt', label: 'Fecha', required: true },
  { field: 'amount', label: 'Monto', required: true },
  { field: 'authCode', label: 'Código de autorización', required: false },
  { field: 'cardLast4', label: 'Últimos 4 dígitos', required: false },
  { field: 'cardBrand', label: 'Marca', required: false },
  { field: 'batchNumber', label: 'Lote', required: false },
  { field: 'terminalId', label: 'Terminal', required: false },
  { field: 'storeCode', label: 'Código de local', required: false },
  { field: 'reference', label: 'Referencia', required: false },
];

export const BANK_FIELDS: readonly StandardFieldDef[] = [
  { field: 'postedAt', label: 'Fecha de contabilización', required: true },
  { field: 'valueDate', label: 'Fecha valor', required: false },
  { field: 'amount', label: 'Monto', required: true },
  { field: 'grossAmount', label: 'Monto bruto', required: false },
  { field: 'feeAmount', label: 'Comisión', required: false },
  { field: 'withholdingAmount', label: 'Retención', required: false },
  { field: 'description', label: 'Descripción', required: false },
  { field: 'reference', label: 'Referencia', required: false },
  { field: 'batchNumber', label: 'Lote', required: false },
  { field: 'authCode', label: 'Código de autorización', required: false },
  { field: 'cardLast4', label: 'Últimos 4 dígitos', required: false },
  { field: 'storeCode', label: 'Código de local', required: false },
  { field: 'movementType', label: 'Tipo de movimiento', required: false },
];

export function fieldsFor(sourceType: SourceType): readonly StandardFieldDef[] {
  return sourceType === 'POS' ? POS_FIELDS : BANK_FIELDS;
}
