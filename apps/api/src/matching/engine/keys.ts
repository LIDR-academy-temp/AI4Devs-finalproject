/**
 * Normaliza un lote o una referencia para compararlos entre archivos: sin prefijo alfabético
 * ni ceros a la izquierda (`D001004` → `1004`, `000001533` → `1533`). Vacío → null.
 */
export function normalizeKeyPart(value: string | null | undefined): string | null {
  if (value === null || value === undefined) return null;
  const trimmed = value.trim().toUpperCase();
  if (trimmed === '') return null;
  const withoutPrefix = trimmed.replace(/^[A-Z]+/, '');
  if (withoutPrefix === '') return null;
  return withoutPrefix.replace(/^0+(?=.)/, '');
}

/** Clave local|lote|referencia; null si falta alguna de las tres partes. */
export function storeBatchRefKey(
  store: string | null,
  batch: string | null,
  reference: string | null,
): string | null {
  const b = normalizeKeyPart(batch);
  const r = normalizeKeyPart(reference);
  const s = store?.trim() ?? '';
  if (s === '' || b === null || r === null) return null;
  return `${s}|${b}|${r}`;
}

export function daysBetween(from: string, to: string): number {
  return Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);
}

/** Agrupa por clave; las claves nulas se omiten. */
export function groupBy<T>(items: T[], keyOf: (item: T) => string | null): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const key = keyOf(item);
    if (key === null) continue;
    const list = map.get(key);
    if (list) list.push(item);
    else map.set(key, [item]);
  }
  return map;
}
