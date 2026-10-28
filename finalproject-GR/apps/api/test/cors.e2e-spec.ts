import { INestApplication } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import request from 'supertest';
import { AppModule } from '../src/app.module';

// Exercises the same app.enableCors(...) configuration main.ts's bootstrap() applies
// (frontend-bootstrap) — bootstrap() itself also calls app.listen(), which isn't
// appropriate to run in a test, so this mirrors its CORS setup on a test app instance
// instead of importing main.ts directly.
describe('CORS (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleRef = await Test.createTestingModule({ imports: [AppModule] }).compile();
    app = moduleRef.createNestApplication();
    app.enableCors({ origin: 'http://localhost:3000' });
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('allows the local web dev origin', async () => {
    const response = await request(app.getHttpServer())
      .get('/health')
      .set('Origin', 'http://localhost:3000');

    expect(response.status).toBe(200);
    expect(response.headers['access-control-allow-origin']).toBe('http://localhost:3000');
  });
});
