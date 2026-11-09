export const ARCHIVO_MAX_SIZE_MESSAGE =
  'El archivo supera el límite de 5 MB. Elige un archivo más pequeño.'

export function mapArchivoUploadHttpError(status: number, detail?: string): string {
  if (status === 413) return ARCHIVO_MAX_SIZE_MESSAGE
  return detail ?? 'Error al subir el archivo'
}
