import { useRef, useState } from 'react';
import type { DragEvent } from 'react';
import { ACCEPTED_EXTENSIONS, MAX_FILE_BYTES } from './api';

/** Mensaje de error si el archivo no cumple formato o tamaño; null si es válido. */
export function validateLocalFile(file: File): string | null {
  const name = file.name.toLowerCase();
  if (!ACCEPTED_EXTENSIONS.some((ext) => name.endsWith(ext))) {
    return 'Formato no admitido: solo se aceptan archivos .csv o .xlsx';
  }
  if (file.size > MAX_FILE_BYTES) {
    return 'El archivo supera el tamaño máximo de 10 MB';
  }
  return null;
}

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
  /** Error devuelto por el servidor (formato, duplicado, etc.). */
  serverError?: string | null;
}

export function FileDropzone({ onFile, disabled, serverError }: Props) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  function handle(file: File | undefined) {
    if (!file) return;
    const problem = validateLocalFile(file);
    setLocalError(problem);
    if (!problem) onFile(file);
  }

  function onDrop(event: DragEvent) {
    event.preventDefault();
    setDragging(false);
    if (!disabled) handle(event.dataTransfer.files[0]);
  }

  const error = localError ?? serverError;
  return (
    <div className="flex flex-col gap-2">
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        className={`flex flex-col items-center gap-3 rounded-lg border-2 border-dashed p-10 text-center ${
          dragging ? 'border-primary bg-secondary' : 'border-input'
        }`}
      >
        <p className="text-sm text-muted-foreground">
          Arrastra aquí un archivo .csv o .xlsx (máx. 10 MB)
        </p>
        <button
          type="button"
          disabled={disabled}
          onClick={() => inputRef.current?.click()}
          className="rounded-md border px-4 py-2 text-sm font-medium disabled:opacity-60"
        >
          {disabled ? 'Subiendo…' : 'Seleccionar archivo'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_EXTENSIONS.join(',')}
          aria-label="Archivo"
          className="hidden"
          onChange={(e) => {
            handle(e.target.files?.[0]);
            e.target.value = '';
          }}
        />
      </div>
      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
