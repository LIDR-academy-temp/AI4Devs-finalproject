import { clerkMiddleware } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { decideRouteProtection } from './lib/route-protection';

// Named proxy.ts, not middleware.ts — Next.js 16 renamed Middleware to Proxy (same
// mechanism, new file/export name; apps/web/AGENTS.md flags this version gap).
export default clerkMiddleware(async (auth, req) => {
  const { userId } = await auth();
  const decision = decideRouteProtection(req.nextUrl.pathname, Boolean(userId));

  if (decision === 'require-auth') {
    await auth.protect();
  }
  if (decision === 'redirect-to-root') {
    return NextResponse.redirect(new URL('/', req.url));
  }
});

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
