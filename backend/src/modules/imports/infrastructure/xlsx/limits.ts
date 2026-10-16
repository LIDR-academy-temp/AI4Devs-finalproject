// Reading limits applied while inflating and parsing a package (design D3). Injectable so that tests use small values.

export interface ReadLimits {
  /** Entries in the zip central directory. */
  maxZipEntries: number
  /** Inflated bytes, summed over the entries the reader actually inflates. */
  maxInflatedBytes: number
  /** Data rows (after the header) per sheet. */
  maxRowsPerSheet: number
  /** Columns with content per sheet. */
  maxColumns: number
  /** Entries of the shared string table. */
  maxSharedStrings: number
  /** Rows kept as preview per sheet. */
  previewRows: number
  /** Distinct values tracked per column before giving up (high cardinality). */
  maxDistinctValues: number
}

const MIB = 1024 * 1024

export const DEFAULT_READ_LIMITS: ReadLimits = {
  maxZipEntries: 10_000,
  maxInflatedBytes: 256 * MIB,
  maxRowsPerSheet: 500_000,
  maxColumns: 256,
  maxSharedStrings: 2_000_000,
  previewRows: 5,
  maxDistinctValues: 50,
}

export function readLimits(overrides?: Partial<ReadLimits>): ReadLimits {
  return { ...DEFAULT_READ_LIMITS, ...overrides }
}
