// The WorkbookReader port over the bounded OOXML reader (design D1 of import-upload-mapping, D3 of import-analyze).
import type { WorkbookReader } from '../application/ports.js'
import type { SheetRows, WorkbookDescription } from '../domain/workbook.js'
import { type DescribeOptions, describeWorkbook } from './xlsx/describe-workbook.js'
import { readSheetRows } from './xlsx/row-reader.js'

export class XlsxWorkbookReader implements WorkbookReader {
  constructor(private readonly options: DescribeOptions = {}) {}

  describe(bytes: Uint8Array, fileName: string): WorkbookDescription {
    return describeWorkbook(bytes, fileName, this.options)
  }

  readRows(bytes: Uint8Array, fileName: string, sheetName: string): SheetRows {
    return readSheetRows(bytes, fileName, sheetName, this.options)
  }
}
