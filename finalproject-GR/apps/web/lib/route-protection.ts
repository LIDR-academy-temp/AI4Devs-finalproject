export type RouteDecision = 'require-auth' | 'redirect-to-root' | 'allow';

const PROTECTED_ROUTE = /^\/test-cases(\/.*)?$/;
const AUTH_ROUTE = /^\/(sign-in|sign-up)(\/.*)?$/;

/**
 * Pure decision logic for proxy.ts's route protection — kept separate from the
 * Clerk/Next.js runtime glue (clerkMiddleware, NextRequest) so it's unit-testable
 * without mocking the request pipeline (design.md).
 */
export function decideRouteProtection(pathname: string, isSignedIn: boolean): RouteDecision {
  if (PROTECTED_ROUTE.test(pathname) && !isSignedIn) {
    return 'require-auth';
  }
  if (AUTH_ROUTE.test(pathname) && isSignedIn) {
    return 'redirect-to-root';
  }
  return 'allow';
}
