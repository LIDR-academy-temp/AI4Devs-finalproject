import { splitKeyword } from '../lib/gherkin';
import { cn } from '@/lib/utils';

export interface GherkinViewProps {
  script: string;
  /** A bug's failed step: a trimmed script line, highlighted wherever it occurs (ADR 0013). */
  failedStep?: string | null;
}

/** Read-only Gherkin with line numbers and keyword highlighting (web-ui-foundation). */
export function GherkinView({ script, failedStep = null }: GherkinViewProps) {
  const lines = script.split(/\r?\n/);
  return (
    <div className="max-h-80 overflow-auto rounded-md border bg-muted/40 py-2 font-mono text-xs">
      <ol className="grid grid-cols-[auto_1fr]">
        {lines.map((line, index) => {
          const { indent, keyword, rest, comment } = splitKeyword(line);
          const failed = failedStep !== null && line.trim() === failedStep;
          return (
            <li
              key={index}
              aria-label={failed ? 'Failed step' : undefined}
              className={cn('col-span-2 grid grid-cols-subgrid', failed && 'bg-fail/15')}
            >
              <span aria-hidden className="select-none pr-3 pl-3 text-right text-muted-foreground tabular-nums">
                {index + 1}
              </span>
              <span className={cn('whitespace-pre-wrap pr-3', comment && 'text-muted-foreground italic', failed && 'font-semibold text-fail')}>
                {indent}
                {keyword && <span className="gherkin-keyword font-semibold text-primary">{keyword}</span>}
                {rest || (keyword ? '' : ' ')}
              </span>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
