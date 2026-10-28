import { BadRequestException } from '@nestjs/common';
import { parseExecutionFields, parseOutcome, parseRunMode } from './execution-input';

const TC_A = '11111111-1111-4111-8111-111111111111';
const TC_B = '22222222-2222-4222-8222-222222222222';

function create(overrides: Record<string, unknown>) {
  return parseExecutionFields({ name: 'Smoke', testCaseIds: [TC_A], ...overrides }, true);
}

describe('parseExecutionFields', () => {
  it('accepts a full valid body and canonicalizes the locale', () => {
    const fields = create({
      testCaseIds: [TC_A, TC_B],
      browser: 'Firefox',
      viewportWidth: 1280,
      viewportHeight: 720,
      locale: 'pt-br',
      timezone: 'Europe/Paris',
      autoCreateBug: true,
    });
    expect(fields).toMatchObject({ testCaseIds: [TC_A, TC_B], browser: 'Firefox', locale: 'pt-BR', timezone: 'Europe/Paris' });
  });

  it('accepts UTC as a timezone', () => {
    expect(create({ timezone: 'UTC' }).timezone).toBe('UTC');
  });

  it.each<[string, Record<string, unknown>]>([
    ['missing name', { name: undefined }],
    ['blank name', { name: '   ' }],
    ['missing testCaseIds', { testCaseIds: undefined }],
    ['empty testCaseIds', { testCaseIds: [] }],
    ['non-uuid test case id', { testCaseIds: ['abc'] }],
    ['duplicate test case', { testCaseIds: [TC_A, TC_A] }],
    ['unknown browser', { browser: 'Safari' }],
    ['zero viewport width', { viewportWidth: 0 }],
    ['fractional viewport height', { viewportHeight: 720.5 }],
    ['invalid locale', { locale: 'not a locale!' }],
    ['invalid timezone', { timezone: 'Mars/Olympus' }],
    ['non-uuid environment', { environmentId: 'env-1' }],
    ['non-boolean autoCreateBug', { autoCreateBug: 'yes' }],
  ])('rejects %s', (_label, overrides) => {
    expect(() => create(overrides)).toThrow(BadRequestException);
  });

  it('makes every field optional on update', () => {
    expect(parseExecutionFields({}, false)).toEqual({});
  });

  it('lets an update clear the environment', () => {
    expect(parseExecutionFields({ environmentId: null }, false)).toEqual({ environmentId: null });
  });
});

describe('parseOutcome', () => {
  it.each(['Pass', 'Fail', 'NeedsReview'])('accepts %s', (outcome) => {
    expect(parseOutcome(outcome)).toBe(outcome);
  });

  it.each(['Pending', 'Skipped', undefined])('rejects %s', (outcome) => {
    expect(() => parseOutcome(outcome)).toThrow(BadRequestException);
  });
});

describe('parseRunMode', () => {
  it('accepts Manual and Automated', () => {
    expect(parseRunMode('Manual')).toBe('Manual');
    expect(parseRunMode('Automated')).toBe('Automated');
  });

  it('rejects anything else', () => {
    expect(() => parseRunMode('Auto')).toThrow(BadRequestException);
  });
});
