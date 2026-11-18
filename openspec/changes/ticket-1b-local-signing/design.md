# Design

## Context

El esquema PostgreSQL (migración `0001_initial_schema`) ya incluye `signing_challenge`, `certificate` y `document_version.content`. El seed genera PKCS#12 local (`demo_pki`, keystore en `backend/var/keys/`) y solicitudes `pending` con `provider` = `local`. Existen rutas de intake, descarga y consulta; faltan implementaciones de `prepare` / `complete` y la orquestación en el widget. Contrato en `docs/openapi.yaml`. Ver motivación en `proposal.md`.

## Goals / Non-Goals

**Goals:**

- Cerrar firma diferida end-to-end con `LocalPAdESProvider` y nivel PAdES B-B (sin TSA).
- Reutilizar la misma interfaz de proveedor que usará `TokenAgentProvider` en el hito 2 (`prepare` → hash → `complete` con firmas externas).
- Respetar append-only en versiones, un desafío de un solo uso y credencial `X-Signing-Token`.
- Habilitar «Firma propia» en el widget con UX de estados y `postMessage`.

**Non-Goals:**

- Validación de cadena para certificados de token (Ticket 1c), webhook y auditoría formal (Ticket 1d), agente PKCS#11, `firmar`, lotes y B-LT/TSA.

## Decisions

### Capa de proveedores y motor PAdES

- **Decisión:** `SignatureProvider` (Protocol) con métodos `prepare(session) -> list[Challenge]` y `complete(session, signatures?) -> SignedPdf`. `LocalPAdESProvider` firma en `complete` sin firmas entrantes; un servicio compartido `PadesEngine` encapsula pyHanko (firma externa / interrumpida: reservar placeholder, hash, incrustar).
- **Alternativa descartada:** Lógica duplicada en el router — dificulta el hito 2 y viola el readme.
- **Alternativa descartada:** Firmar sincrónicamente en un solo endpoint — rompe el contrato OpenAPI y el flujo `token`.

### Fuente del PDF a firmar

- **Decisión:** `prepare` lee bytes de `DocumentVersion` vigente (`current_version_id`), típicamente v1 `uploaded`.
- **Alternativa descartada:** Re-subir el PDF en `prepare` — redundante y fuera de contrato.

### Desafíos y sesión

- **Decisión:** Por solicitud, un `SigningChallenge` con `session_ref` derivado del `X-Signing-Token` (o hash estable del token), `expires_at` = now + 5 min (constante configurable), `consumed_at` al completar. `409` si vencido, consumido o `session_ref` distinto.
- **Alternativa descartada:** Desafío sin atar a sesión — permitiría reutilizar hashes de otro navegador.

### Certificado y clave local

- **Decisión:** Cargar PKCS#12 desde `FIRMADOC_LOCAL_KEYSTORE_PATH` + passphrase del seed; registrar o reutilizar fila `Certificate` con `provider` = `local` al firmar.
- **Nota:** Firma electrónica de demostración (CLAUDE.md) — no reabrir debate legal.

### Verificación en tests

- **Decisión:** Integración con comprobación programática (pyHanko `validate_pdf_signature` o equivalente); documentar comando `pdfsig` para verificación manual en README.
- **Alternativa:** Solo `pdfsig` en CI — frágil en Windows/runner.

### Widget

- **Decisión:** Extender `createApi` con `prepareSignature` y `completeSignature`; `SigningMethods` recibe props/callbacks desde `App` para estados; `postMessage` a `window.parent` con target `window.location.origin` (o `*` solo si el iframe no comparte origen — en dev panel y widget son orígenes distintos: usar `*` con validación del `type` en el panel en un cambio posterior, o documentar origen del widget en mensaje; readme espera panel reciba mensaje — usar `postMessage(payload, '*')` en MVP embebido y el panel filtra por `event.data.type`).

Revisar admin panel - does it listen to postMessage? May be out of 1b - proposal included it. Design: widget sends; panel listener puede ser tarea pequeña en tasks if missing.

### Desambiguación `postMessage` cross-origin

- **Decisión:** Panel en `:4200`, widget en `:5173` — orígenes distintos. El widget MUST enviar `postMessage` con `targetOrigin` = URL del entorno del panel (`http://localhost:4200` vía variable en widget o inferir `document.referrer`). Si `referrer` vacío, enviar a `*` y el panel valida `type` — acordado para MVP local.

## Risks / Trade-offs

- **[Riesgo] Complejidad de pyHanko / firma externa** → Mitigación: tests con PDF mínimo del repo de integración; spike acotado en la primera tarea.
- **[Riesgo] Tamaño del placeholder insuficiente** → Mitigación: reservar 24–32 KB como indica el readme; test con PDF grande.
- **[Riesgo] `postMessage` cross-origin** → Mitigación: listener en `sign-document` del panel en la misma change o documentar prueba manual en iframe.
- **[Riesgo] Ticket 1d sin eventos de auditoría** → Mitigación: aceptado en este change; no bloquear firma; 1d agrega eventos después.

## Migration Plan

- Sin migración Alembic esperada si el modelo cubre desafíos.
- Despliegue: redeploy backend + widget; variable `FIRMADOC_LOCAL_KEYSTORE_PASSPHRASE` obligatoria; ejecutar seed si keystore falta.
- Rollback: revertir código; PDFs ya firmados en v2 permanecen válidos (append-only).

## Open Questions

- ¿TTL del desafío (5 vs 15 min)? Default 5; subir si UX lo requiere.
- ¿Listener `postMessage` en el panel en este mismo change o dejado para pulido UX? Recomendación: incluir mínimo en `sign-document` para cumplir criterio del Ticket 2 hito 1.