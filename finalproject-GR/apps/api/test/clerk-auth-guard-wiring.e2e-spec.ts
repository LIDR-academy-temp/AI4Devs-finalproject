import { Controller, Get, INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// A throwaway controller with no @Public() marker — proves any new route is
// protected by default once the guard is wired globally (task 3.2), without
// needing a real business endpoint (GET /me, task 4.1) to exist yet.
@Controller('__test-protected')
class ThrowawayProtectedController {
  @Get()
  ping() {
    return { pong: true };
  }
}

describe('ClerkAuthGuard wiring (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({
      imports: [AppModule],
      controllers: [ThrowawayProtectedController],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('GET /health still succeeds with no token (@Public())', async () => {
    const response = await request(app.getHttpServer()).get('/health');
    expect(response.status).toBe(200);
  });

  it('a route with no @Public() marker returns 401 with no token', async () => {
    const response = await request(app.getHttpServer()).get('/__test-protected');
    expect(response.status).toBe(401);
  });
});
