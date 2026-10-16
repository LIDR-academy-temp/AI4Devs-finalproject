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
  unassignedTitle: 'Channels not assigned yet',
  unassignedBody: (channels: string[]) =>
    `${channels.join(', ')} ${plural(channels.length, 'has', 'have')} transactions but no account yet. ` +
    `${plural(channels.length, 'It', 'They')} will be attached to the account that processes ` +
    `${plural(channels.length, 'its', 'their')} first settlement.`,
} as const
