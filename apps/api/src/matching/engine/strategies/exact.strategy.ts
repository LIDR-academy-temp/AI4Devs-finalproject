import { groupBy, storeBatchRefKey } from '../keys.js';
import type { BankMov, MatchCandidate, MatchingStrategy, PosTxn, UnmatchedPool } from '../types.js';

const key = (parts: (string | null)[]) =>
  parts.some((p) => p === null || p === '') ? null : parts.join('|');

/**
 * Nivel 1. Dos claves, ambas con bloqueo por ambigüedad:
 *  a) local (según la tabla de relación) + lote + referencia sin prefijo ni ceros, con monto bruto igual;
 *  b) código de autorización + monto + fecha, cuando ambos lados lo traen.
 */
export class ExactStrategy implements MatchingStrategy {
  readonly name = 'exact';

  run(pool: UnmatchedPool): MatchCandidate[] {
    const used = new Set<string>();
    const result = this.byStoreBatchReference(pool, used);
    const remaining = {
      pos: pool.pos.filter((p) => !used.has(p.id)),
      bank: pool.bank.filter((b) => !used.has(b.id)),
    };
    result.push(...this.byAuthorization(remaining));
    return result;
  }

  private byStoreBatchReference(pool: UnmatchedPool, used: Set<string>): MatchCandidate[] {
    const posByKey = groupBy(pool.pos, (p) =>
      storeBatchRefKey(p.bankStoreCode, p.batchNumber, p.reference),
    );
    const bankByKey = groupBy(pool.bank, (b) =>
      storeBatchRefKey(b.storeCode, b.batchNumber, b.reference),
    );
    const out: MatchCandidate[] = [];
    for (const [k, posList] of posByKey) {
      const bankList = bankByKey.get(k);
      if (!bankList || posList.length !== 1 || bankList.length !== 1) continue;
      const pos = posList[0]!;
      const bank = bankList[0]!;
      const bankAmount = bank.grossAmount ?? bank.amount;
      const equal = bankAmount.equals(pos.amount);
      out.push(
        build(
          pos,
          bank,
          bankAmount,
          equal,
          equal
            ? 'Mismo local, lote y referencia, con el mismo monto bruto'
            : `Mismo local, lote y referencia, pero el monto bruto difiere en ${bankAmount.minus(pos.amount).toFixed(2)}`,
        ),
      );
      used.add(pos.id);
      used.add(bank.id);
    }
    return out;
  }

  private byAuthorization(pool: UnmatchedPool): MatchCandidate[] {
    const posKey = (p: PosTxn) => key([p.authCode, p.amount.toFixed(2), p.date]);
    const bankKey = (b: BankMov) =>
      key([b.authCode, (b.grossAmount ?? b.amount).toFixed(2), b.date]);
    const posByKey = groupBy(pool.pos, posKey);
    const bankByKey = groupBy(pool.bank, bankKey);
    const out: MatchCandidate[] = [];
    for (const [k, posList] of posByKey) {
      const bankList = bankByKey.get(k);
      if (!bankList || posList.length !== 1 || bankList.length !== 1) continue;
      const pos = posList[0]!;
      const bank = bankList[0]!;
      out.push(
        build(
          pos,
          bank,
          bank.grossAmount ?? bank.amount,
          true,
          `Mismo código de autorización ${pos.authCode}, monto ${pos.amount.toFixed(2)} y fecha ${pos.date}`,
        ),
      );
    }
    return out;
  }
}

function build(
  pos: PosTxn,
  bank: BankMov,
  bankAmount: BankMov['amount'],
  equal: boolean,
  why: string,
): MatchCandidate {
  return {
    method: 'EXACT',
    cardinality: 'ONE_TO_ONE',
    status: equal ? 'CONFIRMED' : 'PROPOSED',
    confidence: equal ? 1 : 0.8,
    posIds: [pos.id],
    bankIds: [bank.id],
    posTotal: pos.amount,
    bankTotal: bankAmount,
    difference: bankAmount.minus(pos.amount),
    explanation: why,
  };
}
