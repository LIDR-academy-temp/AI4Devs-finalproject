// Must come first: clerk-client and the key provider read process.env when imported.
import '../src/load-env';
import { clerkClient } from '../src/common/clerk-client';
import { PrismaService } from '../src/common/prisma.service';
import { SeedConflictError, SeedTargetError, seedDemo } from '../src/seed/demo-seed';

/**
 * Fills a real user's default project with the ShopFlow demo dataset (specs/demo-seed).
 *
 *   npm run db:seed -w apps/api -- --email you@example.com
 *   npm run db:seed -w apps/api -- --clerk-user-id user_123
 *
 * The user must have signed in once. Additive and idempotent: a rerun writes nothing.
 */
const USAGE = 'Usage: npm run db:seed -w apps/api -- --email <address> | --clerk-user-id <id>';

class UsageError extends Error {}

function argValue(args: string[], flag: string): string | undefined {
  const index = args.indexOf(flag);
  if (index === -1) return undefined;
  const value = args[index + 1];
  if (!value || value.startsWith('--')) throw new UsageError(`${flag} needs a value`);
  return value;
}

async function clerkUserIdFor(email: string): Promise<string> {
  if (!process.env.CLERK_SECRET_KEY) {
    throw new UsageError('CLERK_SECRET_KEY must be set to look up a user by email (or pass --clerk-user-id)');
  }
  const { data } = await clerkClient.users.getUserList({ emailAddress: [email] });
  if (data.length === 0) {
    throw new SeedTargetError(`No Clerk user with email ${email}`);
  }
  if (data.length > 1) {
    console.warn(`Several Clerk users have email ${email}; using ${data[0].id}`);
  }
  return data[0].id;
}

async function main(): Promise<void> {
  const args = process.argv.slice(2);
  const email = argValue(args, '--email');
  const clerkUserIdArg = argValue(args, '--clerk-user-id');
  if (!email === !clerkUserIdArg) {
    throw new UsageError(USAGE);
  }
  const clerkUserId = clerkUserIdArg ?? (await clerkUserIdFor(email!));

  // Same connection as the API (DATABASE_URL, or the docker-compose default).
  const prisma = new PrismaService();
  try {
    const result = await seedDemo(prisma, clerkUserId);
    const where = `project ${result.target.projectId} (workspace ${result.target.workspaceId})`;
    if (result.status === 'already-present') {
      console.log(`The demo data is already present in ${where}; nothing was written.`);
      return;
    }
    const c = result.counts!;
    console.log(`Seeded ShopFlow into ${where} for ${result.target.displayName}:`);
    console.log(
      `  ${c.folders} folders, ${c.testCases} test cases, ${c.environments} environments (${c.credentials} credentials),` +
        ` ${c.executions} executions (${c.runs} runs), ${c.bugs} bugs, ${c.teammates} teammates, ${c.activityEntries} activity entries`,
    );
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((err) => {
  if (err instanceof UsageError || err instanceof SeedTargetError || err instanceof SeedConflictError) {
    console.error(err.message);
  } else {
    console.error(err);
  }
  process.exitCode = 1;
});
