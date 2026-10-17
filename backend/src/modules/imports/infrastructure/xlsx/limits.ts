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

// Real files carry hundreds to a few thousand rows (doc 06: about 350 movements per batch in v1): 64 MiB is
// ample, and 200 000 rows stays reachable within it for sheets with few columns (~150 bytes of XML per row).
export const DEFAULT_READ_LIMITS: ReadLimits = {
  maxZipEntries: 10_000,
  maxInflatedBytes: 64 * MIB,
  maxRowsPerSheet: 200_000,
  maxColumns: 256,
  maxSharedStrings: 2_000_000,
  previewRows: 5,
  maxDistinctValues: 50,
}

export function readLimits(overrides?: Partial<ReadLimits>): ReadLimits {
  return { ...DEFAULT_READ_LIMITS, ...overrides }
}
