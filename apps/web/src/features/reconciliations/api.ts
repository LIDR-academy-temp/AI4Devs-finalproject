import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiPutUpload } from '@/api/client';

export type ReconciliationStatus = 'DRAFT' | 'PROCESSING' | 'COMPLETED' | 'FAILED' | 'CLOSED';

export const STATUS_LABELS: Record<ReconciliationStatus, string> = {
  DRAFT: 'Borrador',
  PROCESSING: 'Procesando',
  COMPLETED: 'Completada',
  FAILED: 'Fallida',
  CLOSED: 'Cerrada',
};

export interface ReconciliationConfig {
  dateWindowDays: number;
  amountTolerance: number;
  feePercent: number;
  withholdingPercent: number;
  enableGrouping: boolean;
}

export const DEFAULT_CONFIG: ReconciliationConfig = {
  dateWindowDays: 3,
  amountTolerance: 0.05,
  feePercent: 0,
  withholdingPercent: 0,
  enableGrouping: true,
};

export interface ReconciliationSummary {
  id: string;
  name: string;
  periodStart: string;
  periodEnd: string;
  status: ReconciliationStatus;
  matchedPercent: number | null;
  createdAt: string;
}

export interface ReconciliationFile {
  id: string;
  sourceType: 'POS' | 'BANK';
  originalName: string;
  status: string;
  totalRows: number;
  validRows: number;
  errorRows: number;
}

export interface ReconciliationDetail extends ReconciliationSummary {
  config: ReconciliationConfig;
  stats: Record<string, unknown> | null;
  completedAt: string | null;
  files: ReconciliationFile[];
}

export interface ReconciliationList {
  items: ReconciliationSummary[];
  total: number;
  page: number;
  pageSize: number;
}

export interface ListFilters {
  status?: ReconciliationStatus | '';
  from?: string;
  to?: string;
  page: number;
  pageSize: number;
}

export interface CreateReconciliationInput {
  name: string;
  periodStart: string;
  periodEnd: string;
  config: ReconciliationConfig;
}

const queryKeys = {
  all: ['reconciliations'] as const,
  list: (filters: ListFilters) => ['reconciliations', 'list', filters] as const,
  detail: (id: string) => ['reconciliations', 'detail', id] as const,
};

export function buildListQuery(filters: ListFilters): string {
  const params = new URLSearchParams();
  if (filters.status) params.set('status', filters.status);
  if (filters.from) params.set('from', filters.from);
  if (filters.to) params.set('to', filters.to);
  params.set('page', String(filters.page));
  params.set('pageSize', String(filters.pageSize));
  return `?${params.toString()}`;
}

export function useReconciliations(filters: ListFilters) {
  return useQuery({
    queryKey: queryKeys.list(filters),
    queryFn: () => apiGet<ReconciliationList>(`/reconciliations${buildListQuery(filters)}`),
    placeholderData: keepPreviousData,
  });
}

/** Intervalo de sondeo mientras la conciliación se está procesando. */
export const POLL_INTERVAL_MS = 2000;

export function useReconciliation(id: string) {
  return useQuery({
    queryKey: queryKeys.detail(id),
    queryFn: () => apiGet<ReconciliationDetail>(`/reconciliations/${id}`),
    retry: false,
    refetchInterval: (query) =>
      query.state.data?.status === 'PROCESSING' ? POLL_INTERVAL_MS : false,
  });
}

export interface RunParams {
  dateWindowDays: number;
  amountTolerance: number;
  feePercent: number;
  withholdingPercent: number;
}

export function useRunReconciliation(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: RunParams) =>
      apiPost<{ id: string; status: string }>(`/reconciliations/${id}/run`, params),
    // Al recibir 202 se vuelve a consultar el detalle, que pasa a PROCESSING y activa el sondeo
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.all }),
  });
}

export interface StoreMapping {
  posStoreName: string;
  bankStoreCode: string;
}

export function useStoreMappings() {
  return useQuery({
    queryKey: ['store-mappings'],
    queryFn: () => apiGet<StoreMapping[]>('/store-mappings'),
  });
}

export function useUploadStoreMappings() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (file: File) => {
      const form = new FormData();
      form.append('file', file);
      return apiPutUpload<{ count: number }>('/store-mappings', form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['store-mappings'] }),
  });
}

export function useCreateReconciliation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateReconciliationInput) =>
      apiPost<ReconciliationDetail>('/reconciliations', input),
    onSuccess: (created) => {
      queryClient.setQueryData(queryKeys.detail(created.id), created);
      return queryClient.invalidateQueries({ queryKey: [...queryKeys.all, 'list'] });
    },
  });
}
