import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiDelete, apiGet, apiPatch, apiPost } from '@/api/client';

export type TxStatus = 'PENDING' | 'MATCHED' | 'PROPOSED' | 'EXCEPTION';
export type MatchMethod = 'EXACT' | 'TOLERANCE' | 'GROUPED' | 'AI' | 'MANUAL';
export type MatchStatus = 'PROPOSED' | 'CONFIRMED' | 'REJECTED';

export interface PosTx {
  id: string;
  rowNumber: number;
  transactionAt: string;
  amount: string;
  cardLast4: string | null;
  authCode: string | null;
  cardBrand: string | null;
  batchNumber: string | null;
  reference: string | null;
  storeCode: string | null;
  status: TxStatus;
  rawData: Record<string, unknown>;
}

export interface BankTx {
  id: string;
  rowNumber: number;
  postedAt: string | null;
  valueDate: string | null;
  amount: string;
  grossAmount: string | null;
  cardLast4: string | null;
  authCode: string | null;
  batchNumber: string | null;
  reference: string | null;
  storeCode: string | null;
  description: string | null;
  status: TxStatus;
  rawData: Record<string, unknown>;
}

export interface MatchView {
  id: string;
  method: MatchMethod;
  cardinality: string;
  status: MatchStatus;
  confidence: number;
  posTotal: string;
  bankTotal: string;
  difference: string;
  explanation: string | null;
  createdBy: string | null;
  confirmedBy: string | null;
  createdAt: string;
  confirmedAt: string | null;
  posTransactions: PosTx[];
  bankMovements: BankTx[];
}

export interface Page<T> {
  items: T[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Summary {
  posCount: number;
  posTotal: string;
  bankCount: number;
  bankTotal: string;
  matchedByMethod: Record<string, number>;
  matchedPos: number;
  matchedBank: number;
  pendingPos: number;
  pendingPosTotal: string;
  pendingBank: number;
  pendingBankTotal: string;
  proposed: number;
  exceptions: number;
  matchedPercent: number;
  totalDifference: string;
}

export interface TxFilters {
  status?: TxStatus;
  dateFrom?: string;
  dateTo?: string;
  amountMin?: string;
  amountMax?: string;
  brand?: string;
  page: number;
  pageSize: number;
}

export interface MatchFilters {
  status?: MatchStatus;
  method?: MatchMethod | '';
  page: number;
  pageSize: number;
}

export const PAGE_SIZE = 25;

export function toQuery(filters: object): string {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries(filters)) {
    if (value !== undefined && value !== null && String(value).trim() !== '') {
      params.set(key, String(value).trim());
    }
  }
  return `?${params.toString()}`;
}

/** `version` cambia cuando termina una ejecución, para refrescar los listados. */
const key = (id: string, version: string, ...rest: unknown[]) =>
  ['results', id, version, ...rest] as const;

export function useSummary(id: string, version: string) {
  return useQuery({
    queryKey: key(id, version, 'summary'),
    queryFn: () => apiGet<Summary>(`/reconciliations/${id}/summary`),
  });
}

export function usePosList(id: string, version: string, filters: TxFilters, enabled = true) {
  return useQuery({
    queryKey: key(id, version, 'pos', filters),
    queryFn: () =>
      apiGet<Page<PosTx>>(`/reconciliations/${id}/pos-transactions${toQuery(filters)}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useBankList(id: string, version: string, filters: TxFilters, enabled = true) {
  return useQuery({
    queryKey: key(id, version, 'bank', filters),
    queryFn: () => apiGet<Page<BankTx>>(`/reconciliations/${id}/bank-movements${toQuery(filters)}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

export function useMatchList(id: string, version: string, filters: MatchFilters, enabled = true) {
  return useQuery({
    queryKey: key(id, version, 'matches', filters),
    queryFn: () => apiGet<Page<MatchView>>(`/reconciliations/${id}/matches${toQuery(filters)}`),
    placeholderData: keepPreviousData,
    enabled,
  });
}

/** Tras cualquier acción humana se invalida todo lo que depende del estado de los cruces. */
function useInvalidate(id: string) {
  const queryClient = useQueryClient();
  return () =>
    Promise.all([
      queryClient.invalidateQueries({ queryKey: ['results', id] }),
      queryClient.invalidateQueries({ queryKey: ['reconciliations'] }),
    ]);
}

export function useCreateManualMatch(id: string) {
  const invalidate = useInvalidate(id);
  return useMutation({
    mutationFn: (body: { posIds: string[]; bankIds: string[]; note?: string }) =>
      apiPost<MatchView>(`/reconciliations/${id}/matches`, body),
    onSuccess: invalidate,
  });
}

export function useDecideMatch(id: string) {
  const invalidate = useInvalidate(id);
  return useMutation({
    mutationFn: (v: { matchId: string; action: 'CONFIRM' | 'REJECT'; note?: string }) =>
      apiPatch<MatchView>(`/matches/${v.matchId}`, { action: v.action, note: v.note }),
    onSuccess: invalidate,
  });
}

export function useUndoMatch(id: string) {
  const invalidate = useInvalidate(id);
  return useMutation({
    mutationFn: (matchId: string) => apiDelete(`/matches/${matchId}`),
    onSuccess: invalidate,
  });
}
