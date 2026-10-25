import { BadRequestException } from '@nestjs/common';
import { failedStepOf, parseBugCreate, parseBugUpdate } from './bug-rules';

const RUN = '11111111-1111-4111-8111-111111111111';
const SCRIPT = 'Feature: Checkout\n  Given a cart with one item\n  Then the total is $10\n';

describe('failedStepOf', () => {
  it('accepts a script line, trimmed', () => {
    expect(failedStepOf(SCRIPT, 'Then the total is $10')).toBe('Then the total is $10');
    expect(failedStepOf(SCRIPT, '   Then the total is $10  ')).toBe('Then the total is $10');
  });

  it('matches lines in CRLF scripts', () => {
    expect(failedStepOf('Given a\r\nThen b\r\n', 'Then b')).toBe('Then b');
  });

  it.each([
    ['a line that is not in the script', 'Then the total is $11'],
    ['a blank step', '   '],
    ['part of a line', 'the total'],
  ])('rejects %s', (_label, step) => {
    expect(failedStepOf(SCRIPT, step)).toBeNull();
  });

  it('rejects any step when there is no script', () => {
    expect(failedStepOf(null, 'Then the total is $10')).toBeNull();
  });
});

describe('parseBugCreate', () => {
  it('accepts a manual bug and defaults optional fields to null', () => {
    expect(parseBugCreate({ title: 'Broken', severity: 'High' })).toEqual({
      title: 'Broken',
      severity: 'High',
      description: null,
      stepsToReproduce: null,
      testRunId: null,
      failedStep: null,
    });
  });

  it('accepts a run and a failed step', () => {
    expect(parseBugCreate({ title: 'Broken', severity: 'Low', testRunId: RUN, failedStep: 'Then x' })).toMatchObject({
      testRunId: RUN,
      failedStep: 'Then x',
    });
  });

  it.each<[string, Record<string, unknown>]>([
    ['blank title', { title: ' ', severity: 'High' }],
    ['missing severity', { title: 'Broken' }],
    ['unknown severity', { title: 'Broken', severity: 'Urgent' }],
    ['non-uuid run', { title: 'Broken', severity: 'High', testRunId: 'run-1' }],
    ['failed step without a run', { title: 'Broken', severity: 'High', failedStep: 'Then x' }],
    ['non-string description', { title: 'Broken', severity: 'High', description: 5 }],
  ])('rejects %s', (_label, body) => {
    expect(() => parseBugCreate(body)).toThrow(BadRequestException);
  });
});

describe('parseBugUpdate', () => {
  it('accepts every status', () => {
    for (const status of ['Open', 'InProgress', 'Resolved', 'Closed', 'WontFix']) {
      expect(parseBugUpdate({ status })).toEqual({ status });
    }
  });

  it('turns empty text into null and leaves absent fields out', () => {
    expect(parseBugUpdate({ description: '', severity: 'Critical' })).toEqual({ description: null, severity: 'Critical' });
  });

  it.each<[string, Record<string, unknown>]>([
    ['unknown status', { status: 'Done' }],
    ['blank title', { title: '' }],
    ['unknown severity', { severity: 'Minor' }],
  ])('rejects %s', (_label, body) => {
    expect(() => parseBugUpdate(body)).toThrow(BadRequestException);
  });
});
