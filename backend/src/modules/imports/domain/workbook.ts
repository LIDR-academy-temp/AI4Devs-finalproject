// What the reader extracts from a workbook: everything as text (design D2), never as numbers.

export interface ColumnStats {
  /** Distinct non-empty values in order of appearance; null once the column exceeds the cap (high cardinality). */
  distinctValues: string[] | null
  /** Cells the spreadsheet stores as numbers (`t="n"` or no type) with a value. */
  numericCells: number
  /**
   * Numeric cells whose text carries an exponent or more than 15 digits: Excel keeps at most 15
   * significant digits, so the precision was already lost in the file. Analysis will reject such IDs.
   */
  lossyNumericCells: number
}

export interface SheetDescription {
  name: string
  hidden: boolean
  /** Row 1, trimmed; empty names become `Column <letter>` and repeats get ` (2)`, ` (3)`. */
  headers: string[]
  /** Rows after the header with at least one cell carrying a value, text or formula. */
  rowCount: number
  /** First rows as text, aligned to `headers` (missing cells are ""). */
  preview: string[][]
  /** One entry per header. */
  columnStats: ColumnStats[]
}

export interface WorkbookDescription {
  sheets: SheetDescription[]
}

/** One data row as the analysis reads it (design D3): cells aligned to the headers, every one as text. */
export interface SheetRow {
  /** Row number in the sheet (header = 1), so the analyst can find it in Excel. */
  rowNo: number
  cells: string[]
  /** Column indexes of numeric cells whose precision was already lost in the file (exponent or more than 15 digits). */
  lossyNumeric: number[]
}

export interface SheetRows {
  headers: string[]
  rows: SheetRow[]
}
