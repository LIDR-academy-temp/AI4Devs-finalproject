// Texts of New Reconciliation and the import workspace (Upload Files, Column Mapping, Analysis). Those fixed by
// openspec/specs/import are literal.
export const strings = {
  newTitle: 'New Reconciliation',
  importTitle: 'Import',
  picker: {
    merchant: 'Merchant',
    provider: 'Provider',
    account: 'Account',
    chooseMerchant: 'Choose a merchant',
    chooseProvider: 'Choose a provider',
    chooseAccount: 'Choose an account',
    notAvailable: 'This merchant, provider or account is not available.',
  },
  upload: {
    dropZone: 'Drop .xlsx files here or choose files',
    chooseAccount: 'Choose an account to upload files.',
    hint: 'One or more .xlsx files of the standard template, up to 20 MB each.',
  },
  header: {
    label: 'Import',
    status: 'Status',
  },
  notAvailable: 'This import is not available.',
  loading: 'Loading the import…',
  loadError: 'Could not load the import.',
  retry: 'Retry',
  files: {
    label: 'Files',
    sheet: (name: string, rows: number) => `${name} · ${rows} ${rows === 1 ? 'row' : 'rows'}`,
    hidden: 'hidden',
    uploading: 'Uploading…',
    pending: 'Waiting…',
    remove: (fileName: string) => `Remove ${fileName}`,
    removeLabel: 'Remove',
    empty: 'No files yet. Add the .xlsx files of the batch.',
    afterAnalysis: 'Files cannot change after the analysis. Cancel the import and start a new one.',
    readOnly: 'Files cannot change in this import.',
  },
  rejections: {
    unsupported_file_type: 'Only .xlsx files are accepted.',
    file_too_large: 'The file exceeds the 20 MB limit.',
    too_many_files: 'Select at most 10 files at a time.',
    file_unreadable: 'The file cannot be read as an Excel workbook.',
    duplicate_file: (fileName: string) => `This file is already in the import as ${fileName}.`,
    duplicateInSelection: 'This file appears twice in the selection.',
    notEditable: (status: string) => `This import can no longer be edited (${status}).`,
    failed: 'The upload failed. Try again.',
  },
  readiness: {
    label: 'Readiness',
    ready: 'Ready to analyze',
    notes: 'To review',
    item: (sheetName: string | null, field: string | undefined, message: string) =>
      `${sheetName ?? 'Import'} · ${field ?? 'note'}: ${message}`,
    unconfirmed: (sheetName: string) => `${sheetName} · confirmation: the mapping of this sheet is not confirmed`,
  },
  analyze: {
    button: 'Analyze',
  },
  steps: {
    label: 'Steps',
    files: 'Files',
    mapping: 'Mapping',
    analysis: 'Analysis',
  },
} as const
