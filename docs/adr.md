# Registro de decisiones de arquitectura (ADR)

Documento **único y liviano**: cada entrada registra una elección importante, el **contexto** en que se tomó y las **consecuencias**. Estado global: decisiones del MVP **aceptadas** (nov 2025–2026).

Operativa diaria: [AGENTS.md](../AGENTS.md). Narrativa y diagramas: [readme.md](../readme.md) y [architecture/](architecture/README.md).

---

## D-01 — PostgreSQL y PDF en `bytea`

**Contexto:** Persistir versiones inmutables y auditoría; se evaluó SQLite y object storage.  
**Decisión:** PostgreSQL 16 en todos los entornos; binario del PDF en `document_version.content` (`bytea`); sin object storage en el MVP.  
**Consecuencias:** Triggers append-only y tests realistas; backups más pesados si crece el volumen.

## D-02 — Puerto `SignatureProvider` (hexagonal)

**Contexto:** Varios mecanismos de firma (token, local, remoto) sin reescribir `prepare` / `complete`.  
**Decisión:** Adaptadores en `app/providers/` detrás de un Protocol; motor PAdES compartido (pyHanko).  
**Consecuencias:** Nuevos proveedores sin tocar la API; capa de abstracción extra en el MVP (costo aceptado).

## D-03 — Agente local en `127.0.0.1` (PKCS#11)

**Contexto:** El navegador y el servidor no acceden al token USB.  
**Decisión:** Firmadoc Agent (Python): `/certificates` y `/sign` sobre hashes; PIN solo en la PC; SoftHSM en dev/CI.  
**Consecuencias:** Instalación/distribución adicional; modelo de seguridad alineado a firma institucional.

## D-04 — Firma diferida y desafíos de un uso

**Contexto:** No bajar el PDF a la PC ni exponer la clave privada en el servidor.  
**Decisión:** `prepare` genera `SigningChallenge` (vencimiento, `session_ref`); `complete` valida y sella; `409` si el desafío no es válido.  
**Consecuencias:** Dos pasos HTTP y orquestación en el widget; superficie mínima en el agente.

## D-05 — Tres esquemas de autenticación

**Contexto:** Integrador, panel admin y widget en enlace público.  
**Decisión:** `X-API-Key` (integrador), `Authorization: Bearer` (panel), `X-Signing-Token` (widget, `#t=`). Recurso ajeno → `404`.  
**Consecuencias:** Separación clara de actores; tres secretos que configurar en demo/producción.

## D-06 — PAdES B-B en el MVP (sin TSA)

**Contexto:** Priorizar flujo verificable con `pdfsig` antes que sellado de tiempo.  
**Decisión:** B-B en hito 1; firmas sucesivas como actualización incremental; TSA/B-LT en v2.  
**Consecuencias:** Implementación acotada; sin prueba de fecha fuerte hasta v2.

## D-07 — Widget embebido por iframe

**Contexto:** Hosts heterogéneos (Angular u otros); Web Component más intrusivo.  
**Decisión:** `signing_url` en iframe; `frame-ancestors` por integrador; `postMessage` `firmadoc:signed`.  
**Consecuencias:** Cero dependencia en el host; atención a altura del iframe y políticas de red local del navegador.

## D-08 — Panel Angular 21 + PrimeNG 21 (no 22)

**Contexto:** Panel de ejemplo institucional; PrimeNG 22 con licencia comercial.  
**Decisión:** Angular 21, PrimeNG `^21`, tema Aura.  
**Consecuencias:** UI estándar MIT; bundle ~600 kB documentado.

## D-09 — Versiones y auditoría append-only

**Contexto:** Cadena de custodia; la v1 no debe modificarse al firmar.  
**Decisión:** Triggers que impiden `UPDATE`/`DELETE` en `document_version` y `audit_event`; vigente vía `current_version_id`.  
**Consecuencias:** Trazabilidad fuerte; correcciones solo con nueva versión.

## D-10 — Cotejo CUIL certificado opcional

**Contexto:** A veces firma quien tiene el token, no necesariamente el CUIL de la solicitud.  
**Decisión:** Sin cotejo por defecto; con `FIRMADOC_REQUIRE_CUIL_MATCH=true` → `403` si no coincide.  
**Consecuencias:** Flexible en demo; con flag apagado confiar en auditoría y certificado en el PDF.

---

### Cómo sumar una decisión

Agregar una sección **D-NN** al final de este archivo (no crear ficheros sueltos salvo que el proyecto crezca y este documento supere ~200 líneas). Si la decisión cambia un contenedor o un diagrama, actualizar también [architecture/](architecture/README.md).