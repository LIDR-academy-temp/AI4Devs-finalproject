import { Prisma, PrismaClient } from '@prisma/client';

/**
 * The only sanctioned way to query a tenant table (ADR 0008). Opens one transaction,
 * sets the workspace context for Postgres RLS to enforce, then runs the caller's
 * queries inside that same transaction so multi-statement operations stay atomic.
 */
export async function withTenantContext<T>(
  prisma: PrismaClient,
  workspaceId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.workspace_id', ${workspaceId}, true)`;
    return fn(tx);
  });
}
