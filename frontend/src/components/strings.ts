// Texts of the components shared by several screens.
export const strings = {
  dateRanges: {
    cycle: 'Cycle',
    status: 'Status',
    dateRange: 'Date range',
    none: '—',
    cycles: { E: 'E', I: 'I', R: 'R' },
    statuses: { APP: 'APP', DEC: 'DEC', CHB: 'CHB', REF: 'REF', RDR: 'RDR' },
  },
  /** Previous / Next of the tables paged on the server, with the reason a button is disabled. */
  pager: {
    previous: 'Previous',
    next: 'Next',
    firstPage: 'This is the first page.',
    lastPage: 'This is the last page.',
  },
} as const
