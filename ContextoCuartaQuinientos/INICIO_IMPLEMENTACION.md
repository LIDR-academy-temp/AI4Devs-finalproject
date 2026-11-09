# Inicio de implementación — CuartaQuinientos (handoff)

> **Para quien recibe el proyecto y va a programar.** Lee esto primero; luego `readme.md` (contrato académico) y los `specs/` por dominio.

## Orden de lectura (≈ 1 h)

| Paso | Archivo | Para qué |
|------|---------|----------|
| 1 | Este archivo | Ruta, orden de build, lagunas cerradas |
| 2 | `readme.md` §5.0 | **5 historias núcleo** + roadmap por fases |
| 3 | `readme.md` §6 (índice tickets) | Backlog 0–40 |
| 4 | `ContextoCuartaQuinientos/_graph.md` | Dependencias entre dominios |
| 5 | `specs/<dominio>.md` | Detalle del dominio que vas a implementar |
| 6 | `referencia/bot-ia-configuracion.md` | **Bot inteligente + proveedor LLM** (obligatorio si tocas BOT/IA) |
| 7 | `SQL/README.md` + `SQL/cuartaquinientos_schema.sql` | Esquema único (solo estructura) + extensiones §3.3 |
| 8 | `scaffolds/` (+ `Bot/` en Entrega 2) | Plantillas API/Web; scaffold del bot Python llega en Entrega 2 |

## Qué es cada pieza en runtime

| Pieza | Repo (Entrega 2+) | Responsabilidad |
|-------|-------------------|-----------------|
| **Web** | `Web/` (nuevo — SETUP-000) | UI React; solo consume API |
| **API** | `GraphApi/` (nuevo — SETUP-000, `readme.md` §2.3) | Reglas de negocio, JWT, Dapper, **IAssistantService**, notificador Telegram |
| **Bot Python** | `Bot/` (Entrega 2) | UX Telegram: menús, botones, `ConversationHandler`; **no** llama al LLM directo |
| **SQL Server** | `/SQL` | Esquema del modelo §3 + RAG (`ia.Fragmentos`) |

## Secuencia de implementación recomendada (Fase 1)

0. **SETUP-000** — scaffolds `GraphApi/`, `GraphApi.Tests/`, `Web/` y CI (readme §6, ticket 33).
1. **DB-000** — BD: script único `SQL/cuartaquinientos_schema.sql` (modelo §3 + extensiones, solo estructura), desplegable e idempotente; ver `.planning/tkt-db-000/`.
1b. **DB-001** — alinear el esquema físico a los nombres lógicos del readme (diccionario §3.2, ADR-008). **DB-002** — catálogos + administrador inicial (+ datos demo opcionales).
2. **USR-BE-007** + **FE-030** + **USR-BE-036** — login JWT, refresh token y cambio de contraseña obligatorio; **USR-BE-008** (perfil) y **USR-BE-009** (gestión de usuarios).
3. **NTF-BE-013** — `INotificacionService` (lo consumen TKT-BE-001 y FNZ-BE-011; va **antes** de TKT-BE-001).
4. **TKT-BE-001**, **002**, **015**, **016** + **FE-031**, **FE-038**.
5. **FNZ-BE-037** (generar cuotas), **FNZ-BE-010**, **011**, **012** + **FE-032**, **FE-039**.
6. **DASH-BE-014** + **FE-040**.
7. **v2 (fuera de entrega final):** bot Telegram, IA/RAG y BI — ver nota de alcance en `readme.md` §0.

## Hosting producción (MonsterASP / runasp.net)

| Recurso | URL / destino |
|---------|----------------|
| API | `https://apicuartaquinientos.runasp.net` |
| Web | `https://cuartaquinientosresidencial.runasp.net` |
| SQL Server | `db24572.public.databaseasp.net` → BD `db24572` |

Secretos: panel del proveedor o variables del sitio API (`ConnectionStrings__Default`, `JwtSettings__Key`, `AllowedOrigins` vía config). Plantillas sin contraseñas: `scaffolds/api/appsettings.Production.example.json`, `scaffolds/web/.env.production.example`. No versionar `*.publishSettings`, `appsettings.Production.json` ni `GraphApi/.continue/`.

**Incidente 2026-11-09 (secretos Git + deploy):** [evidencia/20261109_SEGURIDAD_SECRETOS_GIT/INCIDENTE_SECRETOS_PRODUCCION.md](evidencia/20261109_SEGURIDAD_SECRETOS_GIT/INCIDENTE_SECRETOS_PRODUCCION.md). El script `Deploy-Produccion.ps1` **no** sube `appsettings.Production.json`; tras rotar SQL/JWT hay que actualizar el archivo en el servidor o las variables de entorno.

## C500 Asiste — no es “un chat”

- **Capa A (Python):** presentación en Telegram (comandos, inline keyboards, flujos guiados).
- **Capa B (.NET):** cerebro — `IAssistantService` (intención + RAG + redacción BI) y **ejecución** vía servicios de dominio existentes (`ITicketService`, finanzas, etc.).
- **Capa C (SQL):** estado (`bot.Conversaciones`, `ia.Fragmentos`, dominio `tkt`/`fnz`/…).

Texto libre del usuario → `POST /BOT/Asistente/Consultar`. Acciones (“quiero pagar”, “nuevo ticket”) → intención detectada → **mismo endpoint REST** que la web, con el JWT del usuario vinculado.

**Configuración del proveedor de IA:** solo en el **backend** (`appsettings` + variables de entorno). Detalle completo: [referencia/bot-ia-configuracion.md](referencia/bot-ia-configuracion.md).

## SDD por ticket (Fase 1)

- **Hub:** [`.planning/FASE1_ROADMAP.md`](.planning/FASE1_ROADMAP.md) — **24** filas (SETUP-000 → FE-040). Estado (2026-09-24): las **24** carpetas `tkt-*` con spec + design en **LISTO PARA EJECUTAR** (alineadas a readme §3.2/§6 y ADR-008). Siguiente paso: `/ejecutar` en orden de fila desde `tkt-setup-000`.
- Dominio transversal: `specs/*.md` + contrato `readme.md` §6.
- Fase 2+ (bot/IA): crear `.planning/tkt-*` al abrir cada ticket con `/definir` → `/diseñar`.

