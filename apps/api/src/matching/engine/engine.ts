import type { EngineConfig, MatchCandidate, MatchingStrategy, UnmatchedPool } from './types.js';
import { ExactStrategy } from './strategies/exact.strategy.js';
import { ToleranceStrategy } from './strategies/tolerance.strategy.js';

/**
 * Ejecuta las estrategias en orden; cada una solo ve lo que las anteriores dejaron sin cruzar.
 * Dominio puro: no conoce la base de datos.
 */
export class MatchingEngine {
  constructor(
    private readonly strategies: MatchingStrategy[] = [
      new ExactStrategy(),
      new ToleranceStrategy(),
    ],
  ) {}

  run(input: UnmatchedPool, config: EngineConfig): MatchCandidate[] {
    let pool: UnmatchedPool = { pos: input.pos, bank: input.bank };
    const all: MatchCandidate[] = [];
    for (const strategy of this.strategies) {
      const found = strategy.run(pool, config);
      if (found.length === 0) continue;
      const usedPos = new Set(found.flatMap((c) => c.posIds));
      const usedBank = new Set(found.flatMap((c) => c.bankIds));
      pool = {
        pos: pool.pos.filter((p) => !usedPos.has(p.id)),
        bank: pool.bank.filter((b) => !usedBank.has(b.id)),
      };
      all.push(...found);
    }
    return all;
  }
}
