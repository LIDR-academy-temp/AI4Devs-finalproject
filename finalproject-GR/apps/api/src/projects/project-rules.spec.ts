import { BadRequestException } from '@nestjs/common';
import { deriveSlug, parseName, uniqueSlug } from './project-rules';

describe('parseName', () => {
  it('trims the name', () => {
    expect(parseName('  Mobile App  ')).toBe('Mobile App');
  });

  it.each([['   '], [''], ['x'.repeat(101)], [42], [undefined]])('rejects %p', (value) => {
    expect(() => parseName(value)).toThrow(BadRequestException);
  });

  it('accepts exactly 100 characters', () => {
    expect(parseName('x'.repeat(100))).toHaveLength(100);
  });
});

describe('deriveSlug', () => {
  it.each([
    ['Mobile App (iOS)', 'mobile-app-ios'],
    ['Café', 'cafe'],
    ['***', 'project'],
    ['ショップ', 'project'],
    ['  Checkout -- Web  ', 'checkout-web'],
  ])('%p → %p', (name, slug) => {
    expect(deriveSlug(name)).toBe(slug);
  });

  it('truncates long names to 60 characters without a trailing hyphen', () => {
    const slug = deriveSlug(`${'a'.repeat(59)} b`);
    expect(slug).toBe('a'.repeat(59));
    expect(deriveSlug('b'.repeat(80))).toHaveLength(60);
  });
});

describe('uniqueSlug', () => {
  it('keeps a free slug', () => {
    expect(uniqueSlug('mobile-app', new Set(['web']))).toBe('mobile-app');
  });

  it('takes the lowest free suffix', () => {
    expect(uniqueSlug('mobile-app', new Set(['mobile-app', 'mobile-app-2', 'mobile-app-4']))).toBe('mobile-app-3');
  });
});
