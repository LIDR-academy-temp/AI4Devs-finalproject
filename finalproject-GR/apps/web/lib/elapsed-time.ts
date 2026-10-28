import type { Execution } from './executions-api';

/**
 * The live elapsed timer (ADR 0005): accumulated time plus the current In Progress
 * period. `skewMs` is server time minus client time, so the period is measured on the
 * server's clock even when the browser's is off.
 */
export function elapsedMs(
  execution: Pick<Execution, 'elapsedMsAccumulated' | 'lastResumedAt'>,
  clientNow: number,
  skewMs: number,
): number {
  if (execution.lastResumedAt === null) {
    return execution.elapsedMsAccumulated;
  }
  const running = clientNow + skewMs - Date.parse(execution.lastResumedAt);
  return execution.elapsedMsAccumulated + Math.max(0, running);
}

/** Server-minus-client clock difference, taken when a response arrives. */
export function skewFrom(serverNowIso: string, clientReceivedAt: number): number {
  return Date.parse(serverNowIso) - clientReceivedAt;
}

/** `m:ss`, or `h:mm:ss` from an hour up. */
export function formatElapsed(ms: number): string {
  const totalSeconds = Math.floor(Math.max(0, ms) / 1000);
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  const ss = String(seconds).padStart(2, '0');
  return hours > 0 ? `${hours}:${String(minutes).padStart(2, '0')}:${ss}` : `${minutes}:${ss}`;
}
