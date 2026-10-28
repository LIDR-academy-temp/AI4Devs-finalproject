/**
 * Fractional ordering keys (ADR 0014). A key is a string over DIGITS read as a base-36
 * fraction 0.k1k2…; keyBetween returns a key strictly between two neighbours, so a
 * move rewrites only the moved row. Keys never end in '0' (that would make the same
 * fraction spellable two ways and leave no room before it), and are compared byte-wise —
 * the database columns are COLLATE "C" so Postgres sorts them exactly the same way.
 *
 * In-house rather than the `fractional-indexing` package, which is ESM-only and can't
 * be loaded by this CommonJS API under Jest without extra configuration.
 */
const DIGITS = '0123456789abcdefghijklmnopqrstuvwxyz';

function assertKey(key: string): void {
  if (key === '' || key.endsWith('0') || [...key].some((ch) => !DIGITS.includes(ch))) {
    throw new Error(`invalid ordering key: "${key}"`);
  }
}

/** Midpoint of fractions a (may be '' = 0) and b (null = 1). */
function midpoint(a: string, b: string | null): string {
  if (b !== null) {
    // Shared leading digits stay; recurse on what follows them.
    let n = 0;
    while ((a[n] ?? '0') === b[n]) {
      n++;
    }
    if (n > 0) {
      return b.slice(0, n) + midpoint(a.slice(n), b.slice(n));
    }
  }
  const digitA = a ? DIGITS.indexOf(a[0]) : 0;
  const digitB = b !== null ? DIGITS.indexOf(b[0]) : DIGITS.length;
  if (digitB - digitA > 1) {
    return DIGITS[Math.round((digitA + digitB) / 2)];
  }
  // Adjacent first digits: take b's first digit if b continues, else extend a.
  if (b !== null && b.length > 1) {
    return b.slice(0, 1);
  }
  return DIGITS[digitA] + midpoint(a.slice(1), null);
}

/**
 * A key strictly between `a` and `b`. `a` null means "before everything", `b` null
 * "after everything"; both null gives a first key.
 */
export function keyBetween(a: string | null, b: string | null): string {
  if (a !== null) assertKey(a);
  if (b !== null) assertKey(b);
  if (a !== null && b !== null && a >= b) {
    throw new Error(`keyBetween: "${a}" is not before "${b}"`);
  }
  return midpoint(a ?? '', b);
}
