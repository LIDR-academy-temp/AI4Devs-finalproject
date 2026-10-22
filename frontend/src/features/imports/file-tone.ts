/**
 * The tone of each file of an import in Files and Mapping (design D5): by its position in `detail.files`, which is
 * the same order in both steps, so neighbours never share a tone and a file keeps it from one step to the other.
 * Literal classes, so that Tailwind finds them.
 */
export const FILE_TONES = [
  { block: 'bg-file-tone-1', header: 'bg-file-tone-1-header' },
  { block: 'bg-file-tone-2', header: 'bg-file-tone-2-header' },
  { block: 'bg-file-tone-3', header: 'bg-file-tone-3-header' },
  { block: 'bg-file-tone-4', header: 'bg-file-tone-4-header' },
] as const

export type FileTone = (typeof FILE_TONES)[number]

export function fileTone(position: number): FileTone {
  return FILE_TONES[position % FILE_TONES.length] ?? FILE_TONES[0]
}
