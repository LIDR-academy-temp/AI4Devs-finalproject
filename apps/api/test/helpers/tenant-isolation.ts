/**
 * Plantilla de aislamiento por empresa (spec auth, "Aislamiento de datos por empresa").
 * Cada change posterior con recursos por empresa debe invocar estas comprobaciones sobre su
 * propio endpoint con un recurso real de la empresa B y un token de la empresa A.
 */
import type { INestApplication } from '@nestjs/common';
import request from 'supertest';

export interface TenantIsolationCase {
  app: INestApplication;
  /** Token de un usuario de la empresa A (la que NO es dueña del recurso). */
  tokenCompanyA: string;
  /** Ruta completa (con prefijo) de un recurso que pertenece a la empresa B. */
  foreignResourcePath: string;
  /** Ruta de un recurso inexistente con identificador válido, para comparar respuestas. */
  missingResourcePath: string;
}

/** Un recurso de otra empresa responde exactamente igual que uno inexistente: 404. */
export async function expectForeignResourceIsNotFound(c: TenantIsolationCase): Promise<void> {
  const foreign = await request(c.app.getHttpServer())
    .get(c.foreignResourcePath)
    .set('Authorization', `Bearer ${c.tokenCompanyA}`);
  const missing = await request(c.app.getHttpServer())
    .get(c.missingResourcePath)
    .set('Authorization', `Bearer ${c.tokenCompanyA}`);

  expect(foreign.status).toBe(404);
  expect(missing.status).toBe(404);
  expect(foreign.body.message).toBe(missing.body.message);
}
