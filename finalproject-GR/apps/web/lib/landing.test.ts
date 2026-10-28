import { describe, expect, it } from 'vitest';
import { decideLanding } from './landing';

describe('decideLanding', () => {
  it('sends a signed-in user to /test-cases', () => {
    expect(decideLanding(true)).toBe('/test-cases');
  });

  it('sends a signed-out visitor to /sign-in', () => {
    expect(decideLanding(false)).toBe('/sign-in');
  });
});
