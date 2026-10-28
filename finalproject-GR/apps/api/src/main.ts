// Must stay first: later imports read process.env at load time.
import './load-env';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  // Local dev origin only (frontend-bootstrap) — production CORS origin is a
  // deployment-time decision tied to open-questions.md E1-E4 (hosting), not this.
  const corsOrigin = process.env.WEB_ORIGIN ?? 'http://localhost:3000';
  app.enableCors({ origin: corsOrigin });
  const port = process.env.PORT ? Number(process.env.PORT) : 3001;
  await app.listen(port);
  console.log(`API listening on port ${port}`);
  // Comes from the shell or apps/api/.env (load-env.ts); without it every
  // authenticated request fails with 401.
  if (!process.env.CLERK_SECRET_KEY) {
    console.warn('CLERK_SECRET_KEY is not set: every authenticated request will be rejected with 401.');
  }
}

bootstrap();
