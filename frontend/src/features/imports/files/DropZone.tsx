import { Upload } from 'lucide-react'
import { type DragEvent, useRef, useState } from 'react'
import { strings } from '../strings'

/** Drag and drop of .xlsx files, or a keyboard-reachable button that opens the file chooser (design D13). */
export function DropZone({
  disabled,
  hint,
  onFiles,
}: {
  disabled: boolean
  /** Shown under the zone: why it is disabled, or what it accepts. */
  hint: string
  onFiles: (files: File[]) => void
}) {
  const input = useRef<HTMLInputElement>(null)
  const [over, setOver] = useState(false)

  const drop = (event: DragEvent) => {
    event.preventDefault()
    setOver(false)
    if (disabled) return
    const files = [...(event.dataTransfer?.files ?? [])]
    if (files.length > 0) onFiles(files)
  }

  return (
    <div className="flex flex-col gap-1.5">
      <button
        type="button"
        disabled={disabled}
        onClick={() => input.current?.click()}
        onDragOver={(event) => {
          event.preventDefault()
          if (!disabled) setOver(true)
        }}
        onDragLeave={() => setOver(false)}
        onDrop={drop}
        className={`flex flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-6 py-8 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50 ${over ? 'border-primary bg-accent' : 'border-input bg-background hover:bg-accent/50'}`}
      >
        <Upload aria-hidden="true" className="size-6 text-muted-foreground" />
        <span className="font-medium">{strings.upload.dropZone}</span>
      </button>
      <input
        ref={input}
        type="file"
        multiple
        accept=".xlsx"
        hidden
        disabled={disabled}
        data-testid="file-input"
        onChange={(event) => {
          const files = [...(event.target.files ?? [])]
          event.target.value = ''
          if (files.length > 0) onFiles(files)
        }}
      />
      <p className="text-sm text-muted-foreground">{hint}</p>
    </div>
  )
}
