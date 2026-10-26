import seedrandom from 'seedrandom';
import Decimal from 'decimal.js';

/** Generador pseudoaleatorio determinista: misma semilla → misma secuencia. */
export class Rng {
  private readonly rng: seedrandom.PRNG;

  constructor(seed: string) {
    this.rng = seedrandom(seed);
  }

  float(): number {
    return this.rng();
  }

  int(min: number, max: number): number {
    return min + Math.floor(this.rng() * (max - min + 1));
  }

  pick<T>(items: readonly T[]): T {
    return items[this.int(0, items.length - 1)];
  }

  /** Monto con dos decimales en [min, max]. */
  amount(min: number, max: number): Decimal {
    const cents = this.int(Math.round(min * 100), Math.round(max * 100));
    return new Decimal(cents).div(100);
  }

  digits(length: number): string {
    let out = '';
    for (let i = 0; i < length; i++) out += this.int(0, 9).toString();
    return out;
  }

  alnum(length: number): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ0123456789';
    let out = '';
    for (let i = 0; i < length; i++) out += chars[this.int(0, chars.length - 1)];
    return out;
  }

  shuffle<T>(items: T[]): T[] {
    const copy = [...items];
    for (let i = copy.length - 1; i > 0; i--) {
      const j = this.int(0, i);
      [copy[i], copy[j]] = [copy[j], copy[i]];
    }
    return copy;
  }
}
