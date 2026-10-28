import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

/**
 * The app's single PrismaClient instance, injectable via Nest's DI. Passed into
 * withTenantContext/withUserContext/provisionIdentity — never queried directly
 * (ADR 0008's lint rule covers this file as a recognized mechanism module).
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleDestroy {
  constructor() {
    super({
      datasources: {
        db: { url: process.env.DATABASE_URL ?? 'postgresql://railgun_app:app_dev_password@localhost:5433/railgun' },
      },
    });
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
