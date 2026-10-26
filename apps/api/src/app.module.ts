import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { validateEnv } from './config/env.schema.js';
import { AuthModule } from './auth/auth.module.js';
import { ReconciliationsModule } from './reconciliations/reconciliations.module.js';
import { MatchingModule } from './matching/matching.module.js';
import { ImportsModule } from './imports/imports.module.js';
import { PrismaModule } from './prisma/prisma.module.js';
import { HealthController } from './health/health.controller.js';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // Carga .env desde la raíz del monorepo (y el .env local del paquete si existe)
      envFilePath: ['.env', '../../.env'],
      validate: validateEnv,
    }),
    PrismaModule,
    AuthModule,
    ReconciliationsModule,
    ImportsModule,
    MatchingModule,
  ],
  controllers: [HealthController],
})
export class AppModule {}
