export type LandingDestination = '/test-cases' | '/sign-in';

/**
 * Pure decision logic for the root page's landing redirect (design.md's pattern,
 * same as decideRouteProtection) — kept separate from the Clerk/Next.js server
 * helpers so it's unit-testable without mocking them.
 */
export function decideLanding(isSignedIn: boolean): LandingDestination {
  return isSignedIn ? '/test-cases' : '/sign-in';
}
