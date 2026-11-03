// Texts of the fee screens (web-admin-fees; README §1.3 Fees, Account Fees / Fee History).

export const strings = {
  global: {
    title: 'Fees · all accounts',
  },
  account: {
    crumb: 'Account fees',
    title: (account: string) => `Fees · ${account}`,
    titleLoading: 'Fees',
  },
  always: 'always',
  open: 'open',
  validityArrow: (from: string, to: string) => `${from} → ${to}`,
  valueBoth: (amount: string, rate: string) => `${amount} + ${rate}`,
  rate: (percent: string) => `${percent} %`,
  appliesTo: {
    status: (cycle: string, status: string) => `${cycle} · ${status}`,
    preset: 'batch · preset',
    freeAmount: 'batch · free amount',
    unknown: '—',
  },
}
