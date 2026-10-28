import { describe, expect, it } from 'vitest';
import { elapsedMs, formatElapsed, skewFrom } from './elapsed-time';

const resumedAt = '2026-10-25T10:00:00.000Z';
const resumedMs = Date.parse(resumedAt);

describe('elapsedMs', () => {
  it('adds the running period, measured on the server clock', () => {
    // Client clock is 30s behind the server; 5s have passed on the server since resume.
    const skew = 30_000;
    const clientNow = resumedMs + 5_000 - skew;
    const ms = elapsedMs({ elapsedMsAccumulated: 60_000, lastResumedAt: resumedAt }, clientNow, skew);
    expect(formatElapsed(ms)).toBe('1:05');
  });

  it('stays fixed while paused', () => {
    expect(elapsedMs({ elapsedMsAccumulated: 90_000, lastResumedAt: null }, resumedMs + 999_999, 0)).toBe(90_000);
  });

  it('never goes negative when the period appears to start in the future', () => {
    expect(elapsedMs({ elapsedMsAccumulated: 1_000, lastResumedAt: resumedAt }, resumedMs - 10_000, 0)).toBe(1_000);
  });
});

describe('skewFrom', () => {
  it('is server minus client', () => {
    expect(skewFrom('2026-10-25T10:00:30.000Z', resumedMs)).toBe(30_000);
  });
});

describe('formatElapsed', () => {
  it.each([
    [0, '0:00'],
    [65_000, '1:05'],
    [3_723_000, '1:02:03'],
    [-5, '0:00'],
  ])('%i ms → %s', (ms, text) => {
    expect(formatElapsed(ms)).toBe(text);
  });
});
