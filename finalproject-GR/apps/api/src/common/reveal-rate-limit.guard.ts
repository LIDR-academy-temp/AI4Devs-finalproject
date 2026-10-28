import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';
import type { AuthenticatedRequest } from './clerk-auth.guard';

const WINDOW_MS = 60_000;
const MAX_ATTEMPTS_PER_WINDOW = 10;

interface Window {
  windowStart: number;
  count: number;
}

/**
 * In-process fixed-window limiter for the credential-reveal endpoint (ADR 0004 #5).
 * No new dependency, no Redis — the API runs as a single process in v1 (ADR 0001/0005).
 * Per-instance and resets on restart; see design.md's revisit trigger for when this
 * stops being sufficient (more than one API instance running concurrently).
 */
@Injectable()
export class RevealRateLimitGuard implements CanActivate {
  private readonly windows = new Map<string, Window>();

  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const userId = request.auth!.userId;
    const now = Date.now();

    const existing = this.windows.get(userId);
    if (!existing || now - existing.windowStart >= WINDOW_MS) {
      this.windows.set(userId, { windowStart: now, count: 1 });
      return true;
    }

    if (existing.count >= MAX_ATTEMPTS_PER_WINDOW) {
      throw new HttpException('Too many reveal attempts; try again later', HttpStatus.TOO_MANY_REQUESTS);
    }

    existing.count += 1;
    return true;
  }
}
