import { Decimal } from 'decimal.js';
import { computeExpectedNet } from '../expected-net.js';
import { daysBetween } from '../keys.js';
import type {
  BankMov,
  EngineConfig,
  MatchCandidate,
  MatchingStrategy,
  PosTxn,
  UnmatchedPool,
} from '../types.js';

const cents = (value: Decimal) =>
  value.times(100).toDecimalPlaces(0, Decimal.ROUND_HALF_UP).toNumber();

/** Confianza de una propuesta según el desfase en días. */
export function proposalConfidence(lagDays: number): number {
  if (lagDays === 0) return 0.85;
  if (lagDays <= 2) return 0.75;
  return 0.7;
}

const CONFIRMED_CONFIDENCE = 0.95;

/**
 * Nivel 2. Monto igual al bruto o al neto esperado (dentro de la tolerancia) y abono entre la fecha
 * de la venta y la ventana de días. Solo cruza si el candidato es único en ambos sentidos; se
 * confirma únicamente cuando coinciden los últimos 4 dígitos, si no queda como propuesta.
 */
export class ToleranceStrategy implements MatchingStrategy {
  readonly name = 'tolerance';

  run(pool: UnmatchedPool, config: EngineConfig): MatchCandidate[] {
    const tolerance = new Decimal(config.amountTolerance);
    const bankByCents = new Map<number, BankMov[]>();
    for (const bank of pool.bank) {
      const c = cents(bank.amount);
      const list = bankByCents.get(c);
      if (list) list.push(bank);
      else bankByCents.set(c, [bank]);
    }

    const candidatesOfPos = new Map<string, BankMov[]>();
    const candidatesOfBank = new Map<string, PosTxn[]>();
    for (const pos of pool.pos) {
      const net = computeExpectedNet(pos.amount, config.feePercent, config.withholdingPercent);
      const found = new Map<string, BankMov>();
      for (const target of [pos.amount, net]) {
        const from = cents(target.minus(tolerance));
        const to = cents(target.plus(tolerance));
        for (let c = from; c <= to; c++) {
          for (const bank of bankByCents.get(c) ?? []) {
            if (!bank.amount.minus(target).abs().lessThanOrEqualTo(tolerance)) continue;
            const lag = daysBetween(pos.date, bank.date);
            if (lag < 0 || lag > config.dateWindowDays) continue;
            if (pos.cardLast4 && bank.cardLast4 && pos.cardLast4 !== bank.cardLast4) continue;
            found.set(bank.id, bank);
          }
        }
      }
      if (found.size === 0) continue;
      candidatesOfPos.set(pos.id, [...found.values()]);
      for (const bank of found.values()) {
        const list = candidatesOfBank.get(bank.id);
        if (list) list.push(pos);
        else candidatesOfBank.set(bank.id, [pos]);
      }
    }

    const posById = new Map(pool.pos.map((p) => [p.id, p]));
    const out: MatchCandidate[] = [];
    for (const [posId, banks] of candidatesOfPos) {
      if (banks.length !== 1) continue;
      const bank = banks[0]!;
      if (candidatesOfBank.get(bank.id)?.length !== 1) continue;
      out.push(this.build(posById.get(posId)!, bank));
    }
    return out;
  }

  private build(pos: PosTxn, bank: BankMov): MatchCandidate {
    const lag = daysBetween(pos.date, bank.date);
    const sameCard = pos.cardLast4 !== null && pos.cardLast4 === bank.cardLast4;
    const confirmed = sameCard;
    const parts = [
      `Monto ${bank.amount.toFixed(2)} coincide con la venta de ${pos.amount.toFixed(2)} (bruto o neto esperado)`,
      lag === 0 ? 'mismo día' : `${lag} día${lag === 1 ? '' : 's'} de desfase`,
    ];
    if (sameCard) parts.push(`tarjeta terminada en ${pos.cardLast4}`);
    else parts.push('sin últimos 4 dígitos coincidentes: requiere revisión');
    return {
      method: 'TOLERANCE',
      cardinality: 'ONE_TO_ONE',
      status: confirmed ? 'CONFIRMED' : 'PROPOSED',
      confidence: confirmed ? CONFIRMED_CONFIDENCE : proposalConfidence(lag),
      posIds: [pos.id],
      bankIds: [bank.id],
      posTotal: pos.amount,
      bankTotal: bank.amount,
      difference: bank.amount.minus(pos.amount),
      explanation: parts.join('; '),
    };
  }
}
