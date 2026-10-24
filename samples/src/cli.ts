/**
 * CLI del generador de datasets sintéticos.
 *
 *   npm run samples:generate                       # dataset estándar en samples/standard
 *   npm run samples:generate -- --scenario exact   # un solo escenario en samples/scenarios/exact
 *   npm run samples:generate -- --all              # estándar + los 7 escenarios individuales
 *
 * Opciones: --scenario <standard|exact|dateShift|batch|net|duplicate|orphanPos|orphanBank>
 *           --seed <texto> --pos <n> --out <dir> --all
 */
import { join, resolve } from 'node:path';
import { generateDataset, DEFAULT_OPTIONS } from './generator';
import { isScenarioKind, SCENARIO_KINDS } from './scenarios';
import { writeDataset } from './writers';
import type { DatasetScenario } from './types';

interface CliArgs {
  scenario: DatasetScenario;
  seed: string;
  posCount: number;
  out?: string;
  all: boolean;
}

function parseArgs(argv: string[]): CliArgs {
  const args: CliArgs = {
    scenario: 'standard',
    seed: DEFAULT_OPTIONS.seed,
    posCount: DEFAULT_OPTIONS.posCount,
    all: false,
  };
  for (let i = 0; i < argv.length; i++) {
    const [flag, inline] = argv[i].split('=');
    const next = () => inline ?? argv[++i];
    switch (flag) {
      case '--scenario': {
        const value = next();
        if (value !== 'standard' && !isScenarioKind(value)) {
          throw new Error(
            `Escenario desconocido: ${value}. Válidos: standard, ${SCENARIO_KINDS.join(', ')}`,
          );
        }
        args.scenario = value;
        break;
      }
      case '--seed':
        args.seed = next();
        break;
      case '--pos':
        args.posCount = Number(next());
        if (!Number.isFinite(args.posCount) || args.posCount <= 0)
          throw new Error('--pos debe ser un entero positivo');
        break;
      case '--out':
        args.out = next();
        break;
      case '--all':
        args.all = true;
        break;
      default:
        throw new Error(`Opción desconocida: ${flag}`);
    }
  }
  return args;
}

function generateOne(
  scenario: DatasetScenario,
  seed: string,
  posCount: number,
  outDir: string,
): void {
  const dataset = generateDataset({
    scenario,
    seed,
    posCount,
    includeDebits: scenario === 'standard',
  });
  const files = writeDataset(dataset, outDir);
  const { summary, matches, ambiguous } = dataset.expected;
  console.log(
    `✔ ${scenario.padEnd(10)} → ${outDir}  (POS ${summary.posRows} · banco ${summary.bankRows} · cruces esperados ${matches.length} · ambiguos ${ambiguous.length})`,
  );
  void files;
}

function main(): void {
  const args = parseArgs(process.argv.slice(2));
  const root = resolve(__dirname, '..');
  if (args.all) {
    generateOne('standard', args.seed, args.posCount, join(root, 'standard'));
    for (const kind of SCENARIO_KINDS) {
      generateOne(kind, `${args.seed}-${kind}`, 200, join(root, 'scenarios', kind));
    }
    return;
  }
  const outDir = args.out
    ? resolve(args.out)
    : args.scenario === 'standard'
      ? join(root, 'standard')
      : join(root, 'scenarios', args.scenario);
  generateOne(args.scenario, args.seed, args.posCount, outDir);
}

main();
