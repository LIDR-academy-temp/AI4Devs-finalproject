const base = require('@railgun-qa/config');

// Blocks direct PrismaClient access outside the tenant-context module (ADR 0008).
// RLS is the database-level backstop if this is ever bypassed; this is the first line
// of defense, enforced at review/CI time.
const noDirectPrismaClient = [
  'error',
  {
    paths: [
      {
        name: '@prisma/client',
        importNames: ['PrismaClient'],
        message:
          'Do not import PrismaClient directly. Services receive a Prisma.TransactionClient via withTenantContext/withUserContext (ADR 0008); only the context-mechanism modules in src/common/ may reference PrismaClient.',
      },
    ],
  },
];

module.exports = [
  ...base,
  { ignores: ['dist/**'] },
  {
    files: ['src/**/*.ts'],
    rules: {
      'no-restricted-imports': noDirectPrismaClient,
    },
  },
  {
    // Context-mechanism modules — the recognized exceptions, not arbitrary services.
    files: [
      'src/common/tenant-context.ts',
      'src/common/user-context.ts',
      'src/common/provision-identity.ts',
      // The demo seed's read-only twin of provisionIdentity's lookup (specs/demo-seed).
      'src/common/seed-target.ts',
      'src/common/prisma.service.ts',
      'src/common/project-role.ts',
      'src/common/workspace-role.ts',
      'src/common/resolve-project-workspace.ts',
      'src/common/secrets-encryption.ts',
    ],
    rules: {
      'no-restricted-imports': 'off',
    },
  },
];
