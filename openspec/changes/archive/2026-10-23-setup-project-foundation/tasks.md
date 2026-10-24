# Tasks

## 1. TK-01 · Configurar monorepo, lint, formato y Docker Compose

- [x] 1.1 Inicializar `package.json` raíz con workspaces `apps/*` y scripts `dev`, `lint`, `test`, `db:migrate`, `db:seed`
- [x] 1.2 Crear `apps/api` con NestJS 12 (ESM) + TypeScript 6 (puerto 3000, prefijo `/api/v1`, Swagger en `/api/docs`)
- [x] 1.3 Crear `apps/web` con React 18 + Vite + TypeScript + Tailwind + shadcn/ui (puerto 5173, proxy a la API)
- [x] 1.4 Configurar ESLint y Prettier compartidos en la raíz y verificar `npm run lint` sobre ambos workspaces
- [x] 1.5 Añadir `docker-compose.yml` con PostgreSQL 16 y `.env.example` con `DATABASE_URL`, `JWT_SECRET`, `ANTHROPIC_API_KEY`, `AI_MODEL`, `CORS_ORIGIN`
- [x] 1.6 Validar variables de entorno al arranque de la API con mensaje que nombre la variable ausente
- [x] 1.7 Actualizar readme §1.4 con los comandos reales si difieren del esquema previsto

## 2. TK-02 · Esquema Prisma, migración inicial y seed

- [x] 2.1 Escribir `schema.prisma` con las diez entidades, enums e índices del readme §3 (montos `Decimal(14,2)`)
- [x] 2.2 Generar la migración inicial y añadir a mano la restricción CHECK de `match_items` (exactamente un lado no nulo)
- [x] 2.3 Implementar `seed.ts` idempotente: empresa demo y usuarios ADMIN y ANALYST con contraseña hasheada (bcrypt)
- [x] 2.4 Crear `PrismaService` y módulo global en la API con cierre limpio de conexión
- [x] 2.5 Test de integración: migrar + seed sobre base de datos de test y comprobar entidades y restricción CHECK

## 3. TK-03 · Generador de datasets sintéticos POS/banco

- [x] 3.1 Definir en `samples/` los tipos de escenario (exacto, desfase, lote, neto, duplicado, huérfano POS, huérfano banco) y sus parámetros
- [x] 3.2 Implementar el generador con semilla fija que produce CSV y XLSX de POS y banco con tarjetas enmascaradas
- [x] 3.3 Generar `expected.json` con la contraparte y el nivel esperado de cada fila
- [x] 3.4 Añadir script `npm run samples:generate` y versionar el dataset estándar (≥ 1.000 ventas) en `samples/standard/`
- [x] 3.5 Tests unitarios del generador: reproducibilidad con misma semilla y consistencia entre archivos y `expected.json`
- [x] 3.6 Documentar en readme §2.6 las proporciones del dataset estándar y cómo regenerarlo

## 4. Cierre del change

- [ ] 4.1 Registrar la PR en readme §7 y los prompts relevantes en prompts.md
