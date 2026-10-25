import { Prisma, PrismaClient } from '@prisma/client';

/**
 * Parallel to withTenantContext (ADR 0008), for the narrow user-keyed RLS path
 * (ADR 0003 point 4): sets app.user_id for the duration of one transaction.
 */
export async function withUserContext<T>(
  prisma: PrismaClient,
  userId: string,
  fn: (tx: Prisma.TransactionClient) => Promise<T>,
): Promise<T> {
  return prisma.$transaction(async (tx) => {
    await tx.$executeRaw`SELECT set_config('app.user_id', ${userId}, true)`;
    return fn(tx);
  });
}
