import { useFormContext, useWatch } from 'react-hook-form'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table'
import type { ImportSheet } from '@/lib/api/types'
import { strings } from '../strings'
import { fieldLabel } from './field-options'
import type { MappingValues } from './mapping-form'

/**
 * The first rows the API returns, as text exactly as read (never numbers). Each header says the field of the
 * mapping being edited, so it changes as soon as a field changes. Scrolls inside its card (design D13).
 */
export function Preview({ sheet }: { sheet: ImportSheet }) {
  const { control } = useFormContext<MappingValues>()
  const columns = useWatch({ control, name: `sheets.${sheet.sheetId}.columns` }) ?? []
  if (sheet.preview.length === 0) return <p className="text-xs text-muted-foreground">{strings.mapping.noPreview}</p>

  return (
    <div className="max-w-full overflow-x-auto rounded-md border">
      <Table aria-label={strings.mapping.previewOf(sheet.sheetName)} className="text-xs">
        <TableHeader>
          <TableRow>
            {sheet.columns.map((c, i) => (
              <TableHead key={c.sourceColumn} className="whitespace-nowrap">
                {`${c.sourceColumn} · ${fieldLabel(columns[i]?.targetField ?? null)}`}
              </TableHead>
            ))}
          </TableRow>
        </TableHeader>
        <TableBody>
          {sheet.preview.map((row, r) => (
            // Preview rows have no identity of their own: their position is it.
            // biome-ignore lint/suspicious/noArrayIndexKey: rows of a fixed preview
            <TableRow key={r}>
              {sheet.columns.map((c, i) => (
                <TableCell
                  key={c.sourceColumn}
                  className={
                    columns[i]?.targetField === 'transactionId' ? 'whitespace-nowrap font-mono' : 'whitespace-nowrap'
                  }
                >
                  {row[c.sourceColumn] ?? ''}
                </TableCell>
              ))}
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
