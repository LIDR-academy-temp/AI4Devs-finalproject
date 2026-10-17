// The WorkbookReader port over the bounded OOXML reader (design D1).
import type { WorkbookReader } from '../application/ports.js'
import type { WorkbookDescription } from '../domain/workbook.js'
import { type DescribeOptions, describeWorkbook } from './xlsx/describe-workbook.js'

export class XlsxWorkbookReader implements WorkbookReader {
  constructor(private readonly options: DescribeOptions = {}) {}

  describe(bytes: Uint8Array, fileName: string): WorkbookDescription {
    return describeWorkbook(bytes, fileName, this.options)
  }
}
