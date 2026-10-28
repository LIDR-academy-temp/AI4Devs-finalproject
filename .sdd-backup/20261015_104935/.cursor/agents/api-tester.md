---
name: api-tester
model: inherit
description: Genera archivos .http de pruebas para endpoints nuevos o modificados en el proyecto API. Invocado por /ejecutar y /revisar.
readonly: false
---

# api-tester

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Genera archivos `.http` de pruebas para endpoints nuevos o modificados en <PROYECTO_API>.

Invocado por `/ejecutar` (TDD) y `/revisar` para verificar cobertura de API.

**División de roles:** este agente GENERA el archivo `.http`. `/revisar` lo
INVOCA y valida resultados — si el `.http` del requerimiento ya existe, solo se
actualiza/reejecuta, no se regenera desde cero.

---

## Objetivo

Producir `<TKT>_api_tests.http` con casos de prueba para cada endpoint del requerimiento,
cubriendo: GET con filtros, POST válido, POST inválido y DEL.

---

## Entrada requerida

- `spec.md` del requerimiento → endpoints a implementar / modificar
- `design.md` del requerimiento → rutas, DTOs y reglas de validación
- Patrón de headers <PROYECTO_API> (UserID, Authorization, Environment, WindowName)

---

## Responsabilidad

1. Leer `spec.md` + `design.md` → identificar endpoints en scope.
2. Por cada endpoint generar casos:
   - GET: con filtros opcionales y sin filtros (retorna todos).
   - POST válido: payload completo con datos representativos.
   - POST inválido: payload vacío `{}` → espera `ErrorID > 0`.
   - DEL (si aplica): ID válido y ID inexistente.
3. Escribir `<TKT>_api_tests.http` en la carpeta del requerimiento.
4. Referenciar variables del entorno desde `tools/api-tests/http-client.env.json`.

---

## Patrón de archivo (obligatorio)

```http
# TKT-<id> — <nombre del requerimiento>
# Generado por: api-tester
# Fecha: <yyyymmdd>
# Entorno: usar http-client.env.json (dev / qa)

### ── GET ──────────────────────────────────────────────────
### GET <descripción>
GET {{host}}/<dominio>/<Controller>/<Action>
Content-Type: application/json
UserID: {{userId}}
Authorization: {{token}}
Environment: {{env}}
WindowName: TestWindow

{
  "ColumnNames": "*"
}

### GET con filtro — <campo>
GET {{host}}/<dominio>/<Controller>/<Action>
Content-Type: application/json
UserID: {{userId}}
Authorization: {{token}}
Environment: {{env}}
WindowName: TestWindow

{
  "ColumnNames": "*",
  "<CampoFiltro>": <valor>
}

### ── POST válido ────────────────────────────────────────────
### POST <descripción> — espera ErrorID = 0
POST {{host}}/<dominio>/<Controller>/<Action>
Content-Type: application/json
UserID: {{userId}}
Authorization: {{token}}
Environment: {{env}}
WindowName: TestWindow

{
  "<CampoRequerido1>": <valor>,
  "<CampoRequerido2>": "<texto>"
}

### ── POST inválido ──────────────────────────────────────────
### POST sin campos requeridos — espera ErrorID > 0
POST {{host}}/<dominio>/<Controller>/<Action>
Content-Type: application/json
UserID: {{userId}}
Authorization: {{token}}
Environment: {{env}}
WindowName: TestWindow

{}

### ── DEL (si aplica) ────────────────────────────────────────
### DEL <descripción> — espera ErrorID = 0
DELETE {{host}}/<dominio>/<Controller>/<ID>
Content-Type: application/json
UserID: {{userId}}
Authorization: {{token}}
Environment: {{env}}
WindowName: TestWindow
```

---

## Validaciones esperadas por caso

| Caso | `success` | `ErrorID` | Notas |
|------|-----------|-----------|-------|
| GET con datos | `true` | — | Resultados no vacíos |
| POST válido | `true` | `0` | Retorna ID del registro |
| POST inválido `{}` | `false` | `> 0` | Mensaje descriptivo |
| DEL válido | `true` | `0` | Registro eliminado |
| DEL ID inexistente | `false` | `> 0` | Mensaje descriptivo |

---

## Reglas

- **Naming:** `<TKT>_api_tests.http`
- **Ubicación:** `.planning/tkt-<id>/`
- Siempre incluir los 4 headers <PROYECTO_API>: `UserID`, `Authorization`, `Environment`, `WindowName`.
- Usar variables `{{host}}`, `{{userId}}`, `{{token}}`, `{{env}}` del `http-client.env.json`.
- No hardcodear URLs ni tokens en el archivo `.http`.
- Si el endpoint es masivo (`List<T>`), incluir un caso con 1 item y un caso con múltiples items.

---

## Stop conditions — DETENTE aquí

Para si ocurre cualquiera de estas condiciones:

1. `spec.md` no tiene endpoints definidos — reporta BLOQUEADO, no inventes rutas.
2. `design.md` no especifica DTOs ni rutas — lista los campos faltantes, espera.
3. `http-client.env.json` no existe o no tiene las variables requeridas — notifica antes de generar el archivo.
4. Un endpoint del scope no puede recibir los 4 headers requeridos — no omitas headers, escala.
5. El requerimiento incluye endpoints que modifican datos productivos sin ambiente de test separado — señalarlo antes de incluir esos casos.

## Done-state

- [ ] `<TKT>_api_tests.http` generado en `.planning/tkt-<id>/`.
- [ ] Caso GET, POST válido y POST inválido `{}` por cada endpoint del scope.
- [ ] DEL incluido si aplica.
- [ ] Variables de `http-client.env.json` usadas — sin hardcoding de URLs ni tokens.
- [ ] Los 4 headers del proyecto en cada request: `UserID`, `Authorization`, `Environment`, `WindowName`.

## Output a `/revisar`

```md
### api-tester — TKT-<id>

- Archivo: `<TKT>_api_tests.http`
- Endpoints cubiertos: (lista GET/POST/DEL)
- Estado: GENERADO / REQUIERE EJECUCIÓN MANUAL
```
