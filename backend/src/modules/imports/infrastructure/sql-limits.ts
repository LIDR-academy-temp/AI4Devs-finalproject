// SQL Server bounds that shape how the analysis writes ImportRow (design D1) and looks transactions up (D4).

/**
 * SQL Server accepts at most 2 100 parameters per statement. Batches are sized well under it so that a
 * column added later, or a driver that binds an extra parameter, does not tip a statement over the edge.
 */
export const MAX_SQL_PARAMETERS = 2_000

/** Columns written per ImportRow (every column is bound, nulls included, so the count is fixed). */
export const IMPORT_ROW_COLUMNS = 16

/** Rows per INSERT statement: 125 rows × 16 columns = 2 000 parameters. */
export const ROWS_PER_STATEMENT = Math.floor(MAX_SQL_PARAMETERS / IMPORT_ROW_COLUMNS)

/**
 * The analysis persists all rows and the status change in one interactive transaction. Prisma's default
 * (5 s) is far too short for the 200 000-row ceiling of the reader; the measurement of design D1 sets the bar.
 */
export const ANALYSIS_TX_TIMEOUT_MS = 180_000

/** How long a request may wait for a connection before the transaction starts. */
export const ANALYSIS_TX_MAX_WAIT_MS = 10_000

/**
 * Candidate pairs per transaction lookup query (design D4). The pairs travel as one JSON parameter, so the
 * 2 100-parameter limit does not apply; the batch bounds the JSON (~50 bytes per pair, ~250 KB) and the result
 * set of each round trip. Measured: 20 000 pairs in a single query answer in 144 ms, so 5 000 keeps every query
 * well under a second even at the 100 000-row cap.
 */
export const LOOKUP_PAIRS_PER_QUERY = 5_000
