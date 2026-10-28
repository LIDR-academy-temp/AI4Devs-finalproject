import { CanActivate, ExecutionContext, Injectable, Logger, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { verifyToken } from '@clerk/backend';
import type { Request } from 'express';
import { IS_PUBLIC_KEY } from './public.decorator';
import { clerkClient } from './clerk-client';
import { PrismaService } from './prisma.service';
import { provisionIdentity } from './provision-identity';
import type { ProjectRole } from './project-role';

export interface AuthenticatedRequest extends Request {
  auth?: {
    clerkUserId: string;
    userId: string;
    workspaceId: string;
    /** The user's active project (ADR 0017) — resolved on every request; workspaceId is
     * that project's workspace. */
    projectId: string;
    /** Opportunistic only — not guaranteed present, and nothing consumes it yet. */
    emailVerified?: boolean;
    /** Set only by ProjectRoleGuard, on project-scoped routes. */
    projectRole?: ProjectRole;
    /** Set only by WorkspaceOwnerGuard: the workspace the caller was proven to own. */
    ownedWorkspaceId?: string;
  };
}

/**
 * Verifies the Clerk session JWT against Clerk's JWKS (ADR 0009), then resolves/
 * provisions the internal identity (ADR 0002: "on first authenticated request," not
 * "only on GET /me" — project-authorization is what completes that scope). Runs on
 * every route except ones marked @Public() (GET /health).
 */
@Injectable()
export class ClerkAuthGuard implements CanActivate {
  private readonly logger = new Logger(ClerkAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const authHeader = request.headers.authorization;
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice('Bearer '.length) : undefined;

    if (!token) {
      throw new UnauthorizedException('Missing bearer token');
    }

    let clerkUserId: string;
    let emailVerified: boolean | undefined;
    try {
      const payload = await verifyToken(token, { secretKey: process.env.CLERK_SECRET_KEY });
      clerkUserId = payload.sub;
      emailVerified = (payload as Record<string, unknown>).email_verified as boolean | undefined;
    } catch (error) {
      // The client only ever sees a generic 401; the reason (expired, wrong key,
      // missing key…) goes to the API log so misconfiguration is diagnosable.
      const reason = (error as { reason?: string }).reason ?? (error as Error).message;
      this.logger.warn(`Clerk token verification failed: ${reason}`);
      throw new UnauthorizedException('Invalid or expired token');
    }

    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
    const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUserId;
    const { userId, workspaceId, projectId } = await provisionIdentity(this.prisma, clerkUserId, email, displayName);

    request.auth = { clerkUserId, userId, workspaceId, projectId, emailVerified };
    return true;
  }
}
