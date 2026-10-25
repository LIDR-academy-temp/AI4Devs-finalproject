import { Controller, Get, Req } from '@nestjs/common';
import { clerkClient } from '../common/clerk-client';
import type { AuthenticatedRequest } from '../common/clerk-auth.guard';

interface MeResponse {
  id: string;
  displayName: string;
  email: string;
  workspaceId: string;
  projectId: string;
}

@Controller('me')
export class MeController {
  @Get()
  async getMe(@Req() request: AuthenticatedRequest): Promise<MeResponse> {
    const { clerkUserId, userId, workspaceId, projectId } = request.auth!;

    // Identity is already resolved/provisioned by ClerkAuthGuard; only the display
    // fields need a fresh Clerk profile fetch here.
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    const email = clerkUser.emailAddresses[0]?.emailAddress ?? '';
    const displayName = [clerkUser.firstName, clerkUser.lastName].filter(Boolean).join(' ') || clerkUserId;

    return { id: userId, displayName, email, workspaceId, projectId };
  }
}
