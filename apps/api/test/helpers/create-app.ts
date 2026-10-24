import type { INestApplication } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../../src/app.module.js';
import { configureApp } from '../../src/app.setup.js';
import { validateEnv, type Env } from '../../src/config/env.schema.js';

/** Crea la aplicación completa con variables de entorno sustituibles (p. ej. STORAGE_DIR). */
export async function createTestApp(env: Record<string, string> = {}): Promise<INestApplication> {
  const values = validateEnv({ ...process.env, ...env });
  const moduleRef = await Test.createTestingModule({ imports: [AppModule] })
    .overrideProvider(ConfigService)
    .useValue({ get: (key: keyof Env) => values[key] })
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

export async function loginAs(app: INestApplication, email: string, password: string) {
  const res = await request(app.getHttpServer())
    .post('/api/v1/auth/login')
    .send({ email, password });
  return res.body.accessToken as string;
}
