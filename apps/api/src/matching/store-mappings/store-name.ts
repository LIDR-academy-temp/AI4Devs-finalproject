/** Nombre de local comparable entre archivos: mayúsculas y espacios internos colapsados. */
export function normalizeStoreName(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const text = value.replace(/\s+/g, ' ').trim().toUpperCase();
  return text === '' ? null : text;
}
