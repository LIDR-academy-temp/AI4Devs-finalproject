import { useState } from 'react';
import { Link, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { ApiError } from '@/api/client';
import {
  useFile,
  useFilePreview,
  useImportFile,
  useUploadFile,
  type ImportResult,
  type SourceType,
} from '@/features/imports/api';
import { ColumnMapper, type MapperSettings } from '@/features/imports/ColumnMapper';
import { FileDropzone } from '@/features/imports/FileDropzone';
import { ImportSummary } from '@/features/imports/ImportSummary';
import { toColumnMapping, type ColumnMapping } from '@/features/imports/mapping';

const STEPS: Record<
  'pos' | 'bank',
  { step: number; title: string; sourceType: SourceType; next: string | null }
> = {
  pos: { step: 2, title: 'Archivo del POS', sourceType: 'POS', next: 'bank' },
  bank: { step: 3, title: 'Extracto bancario', sourceType: 'BANK', next: null },
};

const messageOf = (error: unknown, fallback: string) =>
  error instanceof ApiError ? error.message : fallback;

/** Pasos 2 (POS) y 3 (banco) del asistente: subir, previsualizar, mapear e importar. */
export function ImportWizardPage() {
  const { id = '', source = 'pos' } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const config = STEPS[source === 'bank' ? 'bank' : 'pos'];

  // Con ?fileId= se retoma el mapeo de un archivo ya subido (desde el detalle)
  const [fileId, setFileId] = useState<string | undefined>(searchParams.get('fileId') ?? undefined);
  const [result, setResult] = useState<ImportResult | null>(null);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [settings, setSettings] = useState<MapperSettings>({
    headerRow: 1,
    dateFormat: 'dd/MM/yyyy',
    decimalSeparator: ',',
  });

  const upload = useUploadFile(id);
  const preview = useFilePreview(result ? undefined : fileId, settings.headerRow);
  const importFile = useImportFile(fileId ?? '');
  const stored = useFile(result ? fileId : undefined);

  async function onFile(file: File) {
    upload.reset();
    try {
      const created = await upload.mutateAsync({ file, sourceType: config.sourceType });
      setMapping({});
      setFileId(created.id);
    } catch {
      /* el error se muestra desde upload.error */
    }
  }

  async function onImport() {
    importFile.reset();
    try {
      setResult(
        await importFile.mutateAsync({
          columnMapping: toColumnMapping(mapping),
          dateFormat: settings.dateFormat,
          decimalSeparator: settings.decimalSeparator,
          headerRow: settings.headerRow,
        }),
      );
    } catch {
      /* el error se muestra desde importFile.error */
    }
  }

  function restart() {
    setFileId(undefined);
    setResult(null);
    setMapping({});
    upload.reset();
  }

  return (
    <section className="flex flex-col gap-6">
      <div>
        <p className="text-sm text-muted-foreground">Paso {config.step} de 3</p>
        <h1 className="text-2xl font-semibold tracking-tight">{config.title}</h1>
      </div>

      {!fileId && (
        <FileDropzone
          onFile={onFile}
          disabled={upload.isPending}
          serverError={
            upload.isError ? messageOf(upload.error, 'No se pudo subir el archivo') : null
          }
        />
      )}

      {fileId && !result && preview.isPending && (
        <p className="text-sm text-muted-foreground">Leyendo el archivo…</p>
      )}
      {fileId && !result && preview.isError && (
        <p role="alert" className="text-sm text-destructive">
          {messageOf(preview.error, 'No se pudo leer el archivo')}
        </p>
      )}
      {fileId && !result && preview.data && (
        <ColumnMapper
          preview={preview.data}
          mapping={mapping}
          settings={settings}
          onMappingChange={setMapping}
          onSettingsChange={setSettings}
          onImport={onImport}
          importing={importFile.isPending}
          serverError={
            importFile.isError ? messageOf(importFile.error, 'La importación falló') : null
          }
        />
      )}

      {result && (
        <>
          <ImportSummary result={result} allErrors={stored.data?.errors} />
          <div className="flex justify-end gap-3">
            <button type="button" onClick={restart} className="rounded-md border px-4 py-2 text-sm">
              Cargar otro archivo
            </button>
            <button
              type="button"
              onClick={() =>
                navigate(
                  config.next
                    ? `/reconciliations/${id}/import/${config.next}`
                    : `/reconciliations/${id}`,
                )
              }
              className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground"
            >
              {config.next ? 'Continuar con el extracto bancario' : 'Ir a la conciliación'}
            </button>
          </div>
        </>
      )}

      {!result && (
        <div className="flex justify-between text-sm">
          <Link to={`/reconciliations/${id}`} className="underline">
            {config.next ? 'Omitir por ahora' : 'Volver a la conciliación'}
          </Link>
        </div>
      )}
    </section>
  );
}
