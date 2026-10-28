import { keyBetween } from './ordering';

/** Byte-wise comparison, as Postgres COLLATE "C" sorts. */
const byteLess = (a: string, b: string) => Buffer.compare(Buffer.from(a), Buffer.from(b)) < 0;

describe('keyBetween', () => {
  it('produces a first key with no bounds', () => {
    expect(keyBetween(null, null)).toBe('i');
  });

  it('produces keys before the first and after the last', () => {
    const first = keyBetween(null, null);
    expect(byteLess(keyBetween(null, first), first)).toBe(true);
    expect(byteLess(first, keyBetween(first, null))).toBe(true);
  });

  it('produces a key strictly between two keys', () => {
    const k = keyBetween('a', 'c');
    expect(byteLess('a', k) && byteLess(k, 'c')).toBe(true);
  });

  it('extends the key length between adjacent keys', () => {
    const k = keyBetween('a', 'b');
    expect(k.length).toBeGreaterThan(1);
    expect(byteLess('a', k) && byteLess(k, 'b')).toBe(true);
  });

  it('works between the migration backfill keys', () => {
    const k = keyBetween('000000011', '000000021');
    expect(byteLess('000000011', k) && byteLess(k, '000000021')).toBe(true);
    expect(byteLess('000000021', keyBetween('000000021', null))).toBe(true);
  });

  it('never returns a key ending in 0', () => {
    let lo: string | null = null;
    const hi = 'a';
    for (let i = 0; i < 50; i++) {
      lo = keyBetween(lo, hi);
      expect(lo.endsWith('0')).toBe(false);
    }
  });

  it('rejects out-of-order or invalid bounds', () => {
    expect(() => keyBetween('c', 'a')).toThrow();
    expect(() => keyBetween('a', 'a')).toThrow();
    expect(() => keyBetween('a0', null)).toThrow();
    expect(() => keyBetween('A', null)).toThrow();
  });

  it('keeps 1000 random insertions strictly increasing and unique', () => {
    const keys: string[] = [];
    let seed = 42;
    const random = () => {
      seed = (seed * 1103515245 + 12345) % 2147483648;
      return seed / 2147483648;
    };
    for (let i = 0; i < 1000; i++) {
      const at = Math.floor(random() * (keys.length + 1));
      const key = keyBetween(keys[at - 1] ?? null, keys[at] ?? null);
      keys.splice(at, 0, key);
    }
    for (let i = 1; i < keys.length; i++) {
      expect(byteLess(keys[i - 1], keys[i])).toBe(true);
    }
    expect(new Set(keys).size).toBe(keys.length);
  });
});
