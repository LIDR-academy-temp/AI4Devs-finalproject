'use client';

import { useEffect, useMemo, useState } from 'react';
import type { Execution } from './executions-api';
import { elapsedMs, skewFrom } from './elapsed-time';

/**
 * Live elapsed milliseconds for an execution. Skew is re-measured whenever a new
 * server response arrives (its `now` changes); the display ticks every second only
 * while In Progress — the polled execution stays the source of truth.
 */
export function useElapsed(execution: Execution): number {
  const skewMs = useMemo(() => skewFrom(execution.now, Date.now()), [execution.now]);
  const running = execution.status === 'InProgress';
  const [clientNow, setClientNow] = useState(() => Date.now());

  useEffect(() => {
    if (!running) {
      return;
    }
    setClientNow(Date.now());
    const timer = setInterval(() => setClientNow(Date.now()), 1000);
    return () => clearInterval(timer);
  }, [running]);

  // When not running, lastResumedAt is null and clientNow is ignored.
  return elapsedMs(execution, clientNow, skewMs);
}
