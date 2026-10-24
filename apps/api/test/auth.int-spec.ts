/**
 * Integración de auth-and-tenant-isolation: login, token, roles, límite de intentos
 * y plantilla de aislamiento por empresa (404 ante recursos de otra empresa).
 */
import { execSync } from 'node:child_process';
import {
  Controller,
  Get,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  type INestApplication,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { Test } from '@nestjs/testing';
import { PrismaPg } from '@prisma/adapter-pg';
import * as bcrypt from 'bcrypt';
import request from 'supertest';
import { AppModule } from '../src/app.module.js';
import { configureApp } from '../src/app.setup.js';
import { validateEnv, type Env } from '../src/config/env.schema.js';
import { CurrentUser } from '../src/common/decorators/current-user.decorator.js';
import { Roles } from '../src/common/decorators/roles.decorator.js';
import type { AuthUser } from '../src/common/types/auth-user.js';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { PrismaService } from '../src/prisma/prisma.service.js';
import { DEMO_USERS, DEFAULT_PASSWORD, runSeed } from '../prisma/seed-data.js';
import { expectForeignResourceIsNotFound } from './helpers/tenant-isolation.js';

/** Controlador solo de test que aplica la convención: companyId del token en el where. */
@Controller('test-users')
class TenantProbeController {
  constructor(@Inject(PrismaService) private readonly prisma: PrismaService) {}

  @Get(':id')
  async get(@CurrentUser() user: AuthUser, @Param('id', ParseUUIDPipe) id: string) {
    const found = await this.prisma.user.findFirst({
      where: { id, companyId: user.companyId },
      select: { id: true },
    });
    if (!found) throw new NotFoundException('Recurso no encontrado');
    return found;
  }

  @Roles('ADMIN')
  @Get('admin/only')
  adminOnly() {
    return { ok: true };
  }
}

async function createApp(env: Record<string, string> = {}): Promise<INestApplication> {
  // ConfigModule se evalúa al importar AppModule; para variar la configuración se sustituye
  // ConfigService por uno con los valores ya validados más las variables indicadas.
  const values = validateEnv({ ...process.env, ...env });
  const moduleRef = await Test.createTestingModule({
    imports: [AppModule],
    controllers: [TenantProbeController],
  })
    .overrideProvider(ConfigService)
    .useValue({ get: (key: keyof Env) => values[key] })
    .compile();
  const app = moduleRef.createNestApplication();
  configureApp(app);
  await app.init();
  return app;
}

const ADMIN = DEMO_USERS[0];
const ANALYST = DEMO_USERS[1];
const OTHER_EMAIL = 'otro@empresa-b.test';
const INACTIVE_EMAIL = 'inactivo@demo.concilia.app';

describe('Autenticación y aislamiento por empresa', () => {
  let prisma: PrismaClient;
  let app: INestApplication;
  let companyBUserId: string;
  let companyBId: string;
  const http = () => request(app.getHttpServer());

  const login = (email: string, password = DEFAULT_PASSWORD) =>
    http().post('/api/v1/auth/login').send({ email, password });

  beforeAll(async () => {
    execSync('npx prisma migrate deploy', { stdio: 'pipe', env: process.env });
    prisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
    });
    await prisma.$connect();
    await runSeed(prisma);

    const demo = await prisma.company.findFirstOrThrow({ where: { taxId: '0999999999001' } });
    const passwordHash = await bcrypt.hash(DEFAULT_PASSWORD, 12);
    await prisma.user.upsert({
      where: { email: INACTIVE_EMAIL },
      update: { active: false },
      create: {
        companyId: demo.id,
        name: 'Inactivo',
        email: INACTIVE_EMAIL,
        passwordHash,
        active: false,
      },
    });
    const companyB = await prisma.company.upsert({
      where: { taxId: '0888888888001' },
      update: {},
      create: { name: 'Empresa B S.A.', taxId: '0888888888001' },
    });
    const other = await prisma.user.upsert({
      where: { email: OTHER_EMAIL },
      update: {},
      create: { companyId: companyB.id, name: 'Otro', email: OTHER_EMAIL, passwordHash },
    });
    companyBUserId = other.id;
    companyBId = companyB.id;

    app = await createApp();
  });

  afterAll(async () => {
    await app.close();
    await prisma.user.deleteMany({ where: { email: { in: [OTHER_EMAIL, INACTIVE_EMAIL] } } });
    await prisma.company.deleteMany({ where: { taxId: '0888888888001' } });
    await prisma.$disconnect();
  });

  describe('POST /auth/login', () => {
    it('devuelve token y datos básicos con credenciales correctas', async () => {
      const res = await login(ANALYST.email);
      expect(res.status).toBe(200);
      expect(res.body.accessToken).toEqual(expect.any(String));
      expect(res.body.user).toMatchObject({
        email: ANALYST.email,
        role: 'ANALYST',
        company: { name: 'Comercial Demo S.A.' },
      });
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    });

    it('el token lleva sub, companyId y role', async () => {
      const res = await login(ADMIN.email);
      const claims = await app.get(JwtService).verifyAsync(res.body.accessToken);
      expect(claims).toMatchObject({
        sub: expect.any(String),
        companyId: expect.any(String),
        role: 'ADMIN',
      });
      expect(claims.exp - claims.iat).toBe(8 * 3600);
    });

    it('respuesta idéntica para contraseña incorrecta, correo inexistente y usuario inactivo', async () => {
      const wrongPassword = await login(ANALYST.email, 'incorrecta');
      const unknownEmail = await login('no-existe@demo.test');
      const inactive = await login(INACTIVE_EMAIL);

      for (const res of [wrongPassword, unknownEmail, inactive]) {
        expect(res.status).toBe(401);
        expect(res.body).toEqual(wrongPassword.body);
      }
    });

    it('valida el cuerpo (400 si falta el correo o es inválido)', async () => {
      expect((await http().post('/api/v1/auth/login').send({ password: 'x' })).status).toBe(400);
      expect((await login('no-es-correo')).status).toBe(400);
    });
  });

  describe('Acceso protegido por token', () => {
    it('401 sin token', async () => {
      expect((await http().get('/api/v1/auth/me')).status).toBe(401);
    });

    it('401 con token manipulado', async () => {
      const { body } = await login(ANALYST.email);
      const [header, payload, signature] = (body.accessToken as string).split('.');
      const forged = Buffer.from(
        JSON.stringify({
          ...JSON.parse(Buffer.from(payload, 'base64url').toString()),
          role: 'ADMIN',
        }),
      ).toString('base64url');
      const res = await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${header}.${forged}.${signature}`);
      expect(res.status).toBe(401);
    });

    it('401 con token expirado', async () => {
      const expired = await app
        .get(JwtService)
        .signAsync({ sub: companyBUserId, companyId: 'x', role: 'ANALYST' }, { expiresIn: -10 });
      const res = await http().get('/api/v1/auth/me').set('Authorization', `Bearer ${expired}`);
      expect(res.status).toBe(401);
    });

    it('GET /auth/me devuelve nombre, correo, rol y empresa sin hash', async () => {
      const { body } = await login(ANALYST.email);
      const res = await http()
        .get('/api/v1/auth/me')
        .set('Authorization', `Bearer ${body.accessToken}`);
      expect(res.status).toBe(200);
      expect(res.body).toMatchObject({ email: ANALYST.email, role: 'ANALYST' });
      expect(res.body.company.name).toBe('Comercial Demo S.A.');
      expect(JSON.stringify(res.body)).not.toMatch(/passwordHash|\$2[aby]\$/);
    });

    it('el endpoint de salud sigue siendo público', async () => {
      expect((await http().get('/api/v1/health')).status).toBe(200);
    });
  });

  describe('Autorización por rol', () => {
    it('ANALYST recibe 403 en una operación exclusiva de ADMIN; ADMIN accede', async () => {
      const analyst = (await login(ANALYST.email)).body.accessToken;
      const admin = (await login(ADMIN.email)).body.accessToken;
      const path = '/api/v1/test-users/admin/only';
      expect((await http().get(path).set('Authorization', `Bearer ${analyst}`)).status).toBe(403);
      expect((await http().get(path).set('Authorization', `Bearer ${admin}`)).status).toBe(200);
    });
  });

  describe('Aislamiento por empresa (plantilla reutilizable)', () => {
    it('un recurso de otra empresa responde igual que uno inexistente (404)', async () => {
      const tokenCompanyA = (await login(ANALYST.email)).body.accessToken as string;
      await expectForeignResourceIsNotFound({
        app,
        tokenCompanyA,
        foreignResourcePath: `/api/v1/test-users/${companyBUserId}`,
        missingResourcePath: '/api/v1/test-users/00000000-0000-4000-8000-000000000000',
      });
    });

    it('un recurso de la propia empresa sí se devuelve', async () => {
      const token = (await login(ANALYST.email)).body.accessToken as string;
      const me = await http().get('/api/v1/auth/me').set('Authorization', `Bearer ${token}`);
      const res = await http()
        .get(`/api/v1/test-users/${me.body.id}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
    });

    it('ignora un companyId enviado por el cliente (query)', async () => {
      const token = (await login(ANALYST.email)).body.accessToken as string;
      const res = await http()
        .get(`/api/v1/auth/me?companyId=${companyBId}`)
        .set('Authorization', `Bearer ${token}`);
      expect(res.status).toBe(200);
      expect(res.body.company.id).not.toBe(companyBId);
      expect(res.body.company.name).toBe('Comercial Demo S.A.');
    });
  });

  describe('Límite de intentos de login', () => {
    it('429 tras exceder el límite configurado en la ventana', async () => {
      const limited = await createApp({ LOGIN_RATE_LIMIT: '3', LOGIN_RATE_TTL_MS: '60000' });
      try {
        const attempt = () =>
          request(limited.getHttpServer())
            .post('/api/v1/auth/login')
            .send({ email: ANALYST.email, password: 'incorrecta' });
        for (let i = 0; i < 3; i++) expect((await attempt()).status).toBe(401);
        expect((await attempt()).status).toBe(429);
      } finally {
        await limited.close();
      }
    });
  });

  it('cabeceras HTTP endurecidas (Helmet)', async () => {
    const res = await http().get('/api/v1/health');
    expect(res.headers['x-content-type-options']).toBe('nosniff');
    expect(res.headers['x-powered-by']).toBeUndefined();
  });
});
