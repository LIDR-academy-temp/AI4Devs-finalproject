// Reads every data row of one worksheet as text (design D3): the same package handling and limits as
// describeWorkbook, the same parser in rows mode. The sheet is materialized in memory, one sheet at a time.
import type { SheetRow, SheetRows } from '../../domain/workbook.js'
import { type DescribeOptions, withPackage } from './describe-workbook.js'
import { sheetParser } from './sheet-parser.js'

export function readSheetRows(
  bytes: Uint8Array,
  fileName: string,
  sheetName: string,
  options: DescribeOptions = {},
): SheetRows {
  return withPackage(
    bytes,
    fileName,
    options,
    ({ worksheets, sharedStrings, limits, stream, tooLarge, unreadable }) => {
      const sheet = worksheets.find((s) => s.name === sheetName)
      // The sheet was listed when the file was uploaded and the file is immutable: a missing sheet means a changed file.
      if (!sheet) throw unreadable(`missing sheet ${sheetName}`)
      const rows: SheetRow[] = []
      const parser = sheetParser({
        name: sheet.name,
        hidden: sheet.hidden,
        sharedStrings,
        limits,
        tooLarge,
        onRow: (row) => rows.push(row),
      })
      stream(sheet.target, parser)
      return { headers: parser.result().headers, rows }
    },
  )
}
