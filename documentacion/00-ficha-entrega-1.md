> Documento de diseño detallado (origen: README de la Entrega 1). Resumen y punto de entrada: [README](../README.md).

# 0. Ficha del proyecto

### **0.1. Tu nombre completo:**

Ariel Fonseca Sandoval

### **0.2. Nombre del proyecto:**

CuartaQuinientos — Portal de Administración Condominial

### **0.3. Descripción breve del proyecto:**

CuartaQuinientos es un sistema web de gestión condominial para el fraccionamiento donde vive el autor, cuya administración hoy se lleva de forma manual (hojas de cálculo, grupos de WhatsApp y papelería física). **Es la primera plataforma digital del fraccionamiento**: sustituye la operación manual por un sistema diseñado con buenas prácticas desde su concepción. Cubre 15 módulos: usuarios y viviendas, tickets de mantenimiento, cuotas y pagos, notificaciones, dashboard, anuncios, encuestas, juntas, visitas y áreas comunes, archivos, reportes y BI, vehículos, mascotas y almacén, más **«C500 Asiste»**, un bot de Telegram con IA que permite operar todo el sistema desde el chat, resuelve dudas del reglamento y envía recordatorios proactivos (detalle en §1.2). La solución se compone de una SPA en React 18 + TypeScript, una API en ASP.NET Core .NET 9 (REST + GraphQL) sobre SQL Server, y un **bot de Telegram** como canal adicional que comparte la misma API sin duplicar lógica de negocio.

> **Nota de alcance (Entrega 1).** Documentación del **diseño** de la plataforma, antes de escribir código. Lo pendiente de definir se marca `(asumido)`. Telegram, IA, BI y almacén forman parte del diseño objetivo.

> **Alcance entrega final (implementación).** Se implementan todos los dominios documentados en este repositorio **excepto** el bot de Telegram, el asistente con IA (RAG) y reportes/BI avanzados, reservados para **v2**. La API expone **REST y GraphQL** según §4.



### **0.4. URL del proyecto:**

> **Entrega Final — URLs de hosting (MonsterASP / runasp.net):** API `https://apicuartaquinientos.runasp.net`, portal web `https://cuartaquinientosresidencial.runasp.net`. SQL Server gestionado en `db24572.public.databaseasp.net` (detalle §2.4). Secretos y cadenas de conexión solo en el panel del proveedor o variables de entorno, nunca en el repositorio.



### **0.5. URL o archivo comprimido del repositorio**

> [https://github.com/afonsecanice/ProyectoFinalLIDR_AFS](https://github.com/afonsecanice/ProyectoFinalLIDR_AFS) — repositorio **privado** del autor, rama de entrega `feature/entrega-1-AFS`. Se otorga acceso de lectura al equipo de LIDR (TA) mediante invitación al repositorio; la URL se envía en el formulario oficial (Typeform).
>
> **Lectura complementaria:** `prompts.md` (flujo de trabajo con IA).



### **0.6. Documentación técnica — cuatro capas (Módulo 5 AI4Devs)**


| Capa                 | Contenido en este repo                                   | Mantenimiento                   |
| -------------------- | -------------------------------------------------------- | ------------------------------- |
| **Arquitectura**     | `readme.md` §2 (Mermaid, trade-offs, §2.5.1 ADR inline)  | Cambia con decisiones de diseño |
| **API**              | `readme.md` §4 (OpenAPI + GraphQL)                       | Cambia con cada endpoint nuevo  |
| **Código / agentes** | Diseño en `readme.md` §5–§6 (Entrega 2+: repo de código) | Trazabilidad HU → ticket        |
| **Operacional + IA** | `prompts.md`                                             | Flujo humano–IA documentado     |


El eje de evaluación **“Uso de la IA”** se demuestra en `prompts.md` (plantilla AI-Ready, seis flujos completos, configuración de contexto —reglas, skills, subagentes— y poke-holes) y, en este archivo, un **máximo de tres prompts por sección** con el texto enviado, la herramienta usada y el artefacto que quedó en el repo — sin repetir conversaciones enteras.

### **0.7. Mapa del repositorio y punto de arranque (listo para programar)**


| Ruta                                                      | Qué contiene                                                                                                 | Estado Entrega 1                                                         |
| --------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------ |
| `readme.md`                                               | Contrato del producto: arquitectura, modelo, API, historias y tickets (**fuente de verdad del diseño**)      | Completo                                                                 |
| `prompts.md`                                              | Flujo de trabajo con IA, prompts representativos y supervisión humana                                        | Completo                                                                 |
| `CLAUDE.md`                                               | Contexto mínimo para agentes (convenciones, dónde vive cada verdad, comandos)                                | Completo                                                                 |
| `SQL/cuartaquinientos_schema.sql`                         | Esquema físico (DDL, sin datos): 16 esquemas, 73 tablas, 18 vistas `vs*`                                     | Borrador físico; se alinea al readme en **DB-000 → DB-001**              |
| `ContextoCuartaQuinientos/`                               | Handoff (`INICIO_IMPLEMENTACION.md`), `specs/` por dominio, `.planning/` SDD por ticket (`FASE1_ROADMAP.md`) | Fase 1 planificada                                                       |
| `Bot/`                                                    | Bot Python (`python-telegram-bot` 21)                                                                        | **Entrega 2** — se crea en el ticket del bot (§6); Entrega 1 = 0% código |
| `scaffolds/`                                              | Plantillas `appsettings` (API) y `.env` (Web)                                                                | Plantillas                                                               |
| `.cursor/`, `.claude/`, `sdd-toolkit/`, `sdd.config.yaml` | Metodología SDD: reglas, subagentes, comandos, skills, hooks y plantillas                                    | Operativo                                                                |

**Primer paso para programar (Entrega 2):** leer `ContextoCuartaQuinientos/INICIO_IMPLEMENTACION.md` y ejecutar en orden `SETUP-000 → DB-000 → DB-001 → DB-002 → USR-BE-007` (§6).

---
