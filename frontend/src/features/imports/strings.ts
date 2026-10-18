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
  steps: {
    label: 'Steps',
    files: 'Files',
    mapping: 'Mapping',
    analysis: 'Analysis',
  },
} as const
