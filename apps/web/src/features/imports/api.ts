import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { apiGet, apiPost, apiUpload } from '@/api/client';

export type SourceType = 'POS' | 'BANK';

export interface StandardField {
  field: string;
  label: string;
  required: boolean;
}

export interface FileInfo {
  id: string;
  reconciliationId: string;
  sourceType: SourceType;
  originalName: string;
  status: 'UPLOADED' | 'MAPPED' | 'IMPORTED' | 'FAILED';
  totalRows: number;
  validRows: number;
  errorRows: number;
  discardedRows: number;
}

export interface FileDetail extends FileInfo {
  errors: RowError[];
}

export interface FilePreview {
  fileId: string;
  sourceType: SourceType;
  headerRow: number;
  fields: StandardField[];
  headers: string[];
  rows: { rowNumber: number; cells: (string | number | boolean | null)[] }[];
  totalRows: number;
  sheetName: string | null;
  sheetCount: number;
}

export interface RowError {
  row: number;
  field: string;
  reason: string;
}

export interface ImportResult {
  fileId: string;
  status: FileInfo['status'];
  totalRows: number;
  validRows: number;
  errorRows: number;
  discardedDebits: number;
  errors: RowError[];
}

export interface ImportRequest {
  columnMapping: Record<string, string>;
  dateFormat: string;
  decimalSeparator: '.' | ',';
  headerRow: number;
}

export const MAX_FILE_BYTES = 10 * 1024 * 1024;
export const ACCEPTED_EXTENSIONS = ['.csv', '.xlsx'];

export const DATE_FORMATS = ['dd/MM/yyyy', 'MM/dd/yyyy', 'yyyy-MM-dd', 'yyyyMMdd', 'dd-MM-yyyy'];

export function useUploadFile(reconciliationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ file, sourceType }: { file: File; sourceType: SourceType }) => {
      const form = new FormData();
      form.append('sourceType', sourceType);
      form.append('file', file);
      return apiUpload<FileInfo>(`/reconciliations/${reconciliationId}/files`, form);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reconciliations'] }),
  });
}

export function useFilePreview(fileId: string | undefined, headerRow: number) {
  return useQuery({
    queryKey: ['files', fileId, 'preview', headerRow],
    queryFn: () => apiGet<FilePreview>(`/files/${fileId}/preview?headerRow=${headerRow}`),
    enabled: Boolean(fileId),
    retry: false,
  });
}

export function useFile(fileId: string | undefined) {
  return useQuery({
    queryKey: ['files', fileId],
    queryFn: () => apiGet<FileDetail>(`/files/${fileId}`),
    enabled: Boolean(fileId),
    retry: false,
  });
}

export function useImportFile(fileId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (request: ImportRequest) =>
      apiPost<ImportResult>(`/files/${fileId}/import`, request),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['reconciliations'] }),
  });
}
