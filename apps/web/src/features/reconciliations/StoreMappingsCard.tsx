import { useRef } from 'react';
import { ApiError } from '@/api/client';
import { useStoreMappings, useUploadStoreMappings } from './api';

/** Tabla de relación de locales POS ↔ banco de la empresa (se carga desde un Excel de dos columnas). */
export function StoreMappingsCard() {
  const { data } = useStoreMappings();
  const upload = useUploadStoreMappings();
  const inputRef = useRef<HTMLInputElement>(null);
  const error =
    upload.error instanceof ApiError
      ? upload.error.message
      : upload.error
        ? 'No se pudo cargar la relación de locales'
        : null;

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="mb-2 flex items-center justify-between">
        <h2 className="text-sm font-medium">Relación de locales</h2>
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={upload.isPending}
          className="rounded-md border px-3 py-1 text-sm disabled:opacity-50"
        >
          {data && data.length > 0 ? 'Reemplazar relación' : 'Cargar relación'}
        </button>
        <input
          ref={inputRef}
          type="file"
          accept=".xlsx,.csv"
          aria-label="Archivo de relación de locales"
          className="hidden"
          onChange={(e) => {
            const file = e.target.files?.[0];
            if (file) upload.mutate(file);
            e.target.value = '';
          }}
        />
      </div>
      <p className="text-sm text-muted-foreground">
        {data && data.length > 0
          ? `${data.length} locales relacionados. El cruce por local, lote y referencia los usa.`
          : 'Sin relación cargada: el cruce por local, lote y referencia no podrá aplicarse. Sube un archivo con el código de establecimiento del banco y el nombre del local del POS.'}
      </p>
      {error && (
        <p role="alert" className="mt-2 text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  );
}
