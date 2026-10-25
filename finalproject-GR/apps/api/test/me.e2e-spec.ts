import { randomUUID } from 'crypto';
import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Mocks Clerk at the boundary (design.md's corrected Risk resolution): the real
// session-JWT verification against live Clerk JWKS needs a live account and either a
// browser or Clerk's ticket-redemption flow — neither of which is a simple backend
// call. Everything downstream of "the token resolved to this Clerk user id" (the
// guard's own logic, provisionIdentity, real Postgres) is exercised for real.
jest.mock('@clerk/backend', () => ({
  // The bearer token value itself stands in for the resolved Clerk user id.
  verifyToken: jest.fn(async (token: string) => ({ sub: token })),
  createClerkClient: jest.fn(() => ({
    users: {
      getUser: jest.fn(async (clerkUserId: string) => ({
        emailAddresses: [{ emailAddress: `${clerkUserId}@example.com` }],
        firstName: 'Test',
        lastName: 'User',
      })),
    },
  })),
}));

describe('GET /me (e2e, Clerk mocked at the boundary)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('provisions a new identity on first contact and returns its profile', async () => {
    const clerkUserId = `clerk-me-${randomUUID()}`;

    const response = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${clerkUserId}`);

    expect(response.status).toBe(200);
    expect(response.body).toEqual({
      id: expect.any(String),
      displayName: 'Test User',
      email: `${clerkUserId}@example.com`,
      workspaceId: expect.any(String),
      projectId: expect.any(String),
    });
  });

  it('is idempotent: calling twice for the same identity returns the same workspaceId and projectId', async () => {
    const clerkUserId = `clerk-me-${randomUUID()}`;

    const first = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${clerkUserId}`);
    const second = await request(app.getHttpServer()).get('/me').set('Authorization', `Bearer ${clerkUserId}`);

    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    expect(second.body.id).toBe(first.body.id);
    expect(second.body.workspaceId).toBe(first.body.workspaceId);
    expect(second.body.projectId).toBe(first.body.projectId);
  });
});
