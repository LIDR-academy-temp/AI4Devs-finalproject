const plural = (count: number, one: string, many: string) => (count === 1 ? one : many)

export const strings = {
  title: 'Accounts',
  merchant: 'Merchant',
  provider: 'Provider',
  chooseMerchant: 'Choose a merchant',
  chooseProvider: 'Choose a provider',
  chooseHint: 'Choose a merchant and a provider to see their accounts.',
  notAvailable: 'This merchant or provider is not available.',
  noAccounts: 'This provider has no accounts yet.',
  loading: 'Loading accounts…',
  loadError: 'Could not load accounts.',
  retry: 'Retry',
  columns: {
    account: 'Account',
    channels: 'Channels',
    reservePolicy: 'Reserve policy on chargeback',
    reserveCap: 'Reserve cap',
    status: 'Status',
    settlements: 'Settlements',
    fees: 'Fees',
  },
  none: 'none',
  active: 'active',
  closed: 'closed',
  primary: 'primary',
  historical: 'historical',
  primaryIn: (account: string) => `primary in ${account}`,
  noPrimary: 'no primary account',
  noChannels: 'No channels yet',
  loadingChannels: 'Loading channels…',
  settlements: 'Settlements',
  settlementsOf: (account: string) => `Settlements of ${account}`,
  fees: 'Fees',
  feesOf: (account: string) => `Fees of ${account}`,
  /** Account Detail (web-admin-accounts design D2, D4). */
  detail: {
    crumb: 'Account detail',
    titleLoading: 'Account',
    hierarchy: (merchant: string, provider: string) => `${merchant} › ${provider}`,
    notAvailable: 'This account is not available.',
    loading: 'Loading the account…',
    loadError: 'Could not load the account.',
    tabs: { label: 'Account sections', overview: 'Overview', fees: 'Fees' },
  },
  /** Channel Assignment (web-admin-accounts design D8). */
  channelAssignment: {
    title: 'Channel Assignment',
  },
  /** The merchant → provider → account choice of New Reconciliation and Settlement List. */
  picker: {
    merchant: 'Merchant',
    provider: 'Provider',
    account: 'Account',
    chooseMerchant: 'Choose a merchant',
    chooseProvider: 'Choose a provider',
    chooseAccount: 'Choose an account',
    closedAccount: (account: string) => `${account} (closed)`,
    notAvailable: 'This merchant, provider or account is not available.',
  },
  unassignedTitle: 'Channels not assigned yet',
  unassignedBody: (channels: string[]) =>
    `${channels.join(', ')} ${plural(channels.length, 'has', 'have')} transactions but no account yet. ` +
    `${plural(channels.length, 'It', 'They')} will be attached to the account that processes ` +
    `${plural(channels.length, 'its', 'their')} first settlement.`,
} as const
