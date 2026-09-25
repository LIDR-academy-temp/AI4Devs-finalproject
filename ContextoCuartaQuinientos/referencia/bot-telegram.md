# Referencia — Bot Telegram (planificado)

> **No hay carpeta `Bot/` en el repo** (solo ruta planificada en `sdd.config.yaml`).  
> Fuente de verdad del diseño: **`readme.md`** §1.2 (módulo 15), §2.5, **§2.8**, §4, §5 (HU-BOT-*), §6 (TKT-BOT-003, BOT-BE-*, IA-BE-005).  
> **Configuración IA + orquestación:** [bot-ia-configuracion.md](bot-ia-configuracion.md) (obligatorio antes de codificar el bot).

## Target greenfield

| Pieza | Elección |
|-------|----------|
| Runtime | Python 3.11+ |
| Librería | `python-telegram-bot` 21.x |
| Modo | Webhook (prod) / polling (dev) |
| Backend | Cliente **REST** del mismo API (`Authorization: Bearer`), sin duplicar reglas de negocio |
| Auth usuario | Vinculación por **token de un solo uso** desde portal — nunca password en el chat |
| Persistencia delta | `bot.CuentasTelegram`, `bot.TokensVinculacion`, `bot.Conversaciones`, `bot.Sugerencias`, `ia.*` (RAG) |
| Inteligencia | **Backend** `IAssistantService` + `ILlmProvider` — el bot Python **no** llama al LLM |

## Tres capas (no confundir con “chat GPT en Telegram”)

1. **Python** — UX Telegram (botones, flujos, JWT en sesión).
2. **.NET** — reglas de negocio + IA (RAG, intención, escalado) + notificador saliente.
3. **SQL** — datos y fragmentos RAG.

## Flujos documentados (tickets)

- **Vincular:** `POST /SGR/Usuarios/telegram/token` + `POST .../telegram/vincular` (BOT-BE-004).
- **Crear ticket:** ConversationHandler → `POST /TKT/Tickets` (TKT-BOT-003 / BOT-BE-022).
- **Cuotas:** BOT-BE-019 → servicio finanzas existente.
- **Notificaciones push:** BOT-BE-020 + `ntf.NotificacionesEntrega`.
- **Trabajador / evidencia:** BOT-BE-021.
- **Asistente RAG:** `POST /BOT/Asistente/Consultar` (IA-BE-005).

## Paridad web ↔ bot

El readme declara los **15 módulos** disponibles por perfil en formato conversacional (residente / trabajador / admin), más RAG y sugerencias proactivas.

## Qué tomar de la referencia actual

- **API + Web:** la lógica de negocio y los contratos REST/GraphQL viven en el backend .NET 9 — ver `readme.md` §2 y §4.
- **Telegram:** implementación **nueva**, cliente delgado sobre la misma API.

## Entrega 1 vs 2

- **Entrega 1:** solo documentación (este archivo + readme).
- **Entrega 2+:** crear repo/carpeta `Bot/` e integrar con API desplegada.
