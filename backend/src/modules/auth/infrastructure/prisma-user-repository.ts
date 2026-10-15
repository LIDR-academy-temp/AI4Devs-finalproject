import { MerchantScope, PermissionCode } from '@recon/shared'
import type { Prisma, PrismaClient } from '../../../generated/prisma/client.js'
import type { MerchantRef, UserRecord, UserRepository } from '../application/ports.js'

const userWithAccess = {
  role: { include: { permissions: { select: { permissionCode: true } } } },
  merchants: { select: { merchantId: true }, orderBy: { merchantId: 'asc' } },
} satisfies Prisma.UserInclude

type UserWithAccess = Prisma.UserGetPayload<{ include: typeof userWithAccess }>

function toRecord(user: UserWithAccess): UserRecord {
  const scope = MerchantScope.safeParse(user.merchantScope)
  return {
    userId: user.userId,
    userName: user.userName,
    displayName: user.displayName,
    email: user.email,
    passwordHash: user.passwordHash,
    isActive: user.isActive,
    role: user.role.name,
    // Codes unknown to this build are dropped: a permission is never granted by accident.
    permissions: user.role.permissions.flatMap((p) => {
      const code = PermissionCode.safeParse(p.permissionCode)
      return code.success ? [code.data] : []
    }),
    // An unexpected value fails closed to "assigned" (only explicit UserMerchant rows).
    merchantScope: scope.success ? scope.data : 'assigned',
    assignedMerchantIds: user.merchants.map((m) => m.merchantId),
  }
}

/** One query per lookup: user, role, permissions and UserMerchant rows. */
export class PrismaUserRepository implements UserRepository {
  constructor(private readonly prisma: PrismaClient) {}

  async findByUserName(userName: string): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { userName }, include: userWithAccess })
    return user ? toRecord(user) : null
  }

  async findById(userId: number): Promise<UserRecord | null> {
    const user = await this.prisma.user.findUnique({ where: { userId }, include: userWithAccess })
    return user ? toRecord(user) : null
  }

  async listMerchants(): Promise<MerchantRef[]> {
    return this.prisma.merchant.findMany({ select: { merchantId: true, name: true }, orderBy: { merchantId: 'asc' } })
  }
}
