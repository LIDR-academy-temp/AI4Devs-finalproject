[← index](_index.md) | [design →](design.md)

# spec.md — PROD-RES-001: Residente en producción

## User story

Como **residente** en el portal publicado, quiero ver y usar encuestas, tickets, pases de visita y menú de navegación coherentes con el diseño, para operar sin errores 404/500 ni campos técnicos (IDs numéricos).

## Alcance (Must)

### Encuestas (Web + API)
- Listado/detalle residente: normalizar respuesta API PascalCase → rutas no deben ir a `/encuestas/undefined`.
- Enviar respuestas: preguntas catálogo **Texto libre** (DB-004) deben contarse como texto, no solo `tipoPregunta === 'Texto'`.
- Resultados residente: `GET …/resultados` sin 500 (SQL `GROUP BY` con `Orden` en opciones).

### Tickets (API)
- `POST /TKT/Tickets` sin 500 cuando no existe tabla `tkt.CanalesTicket` en prod (canal opcional).
- Notificación a admins no debe revertir creación del ticket si falla el aviso.

### Visitas — menú y formulario (Web + SQL)
- Ítem **Pases QR** (`/visitas/pases`) visible en sidebar Residente bajo Mi Comunidad.
- Formulario residente: **Tipo ID** como `<select>` con catálogo `/VTS/TiposIdentificacion`, no input numérico.

### Navegación (Web)
- Si el árbol SGR en prod omite nodos del manifest (p. ej. DB-008 no corrido), completar ítems implementados del manifest sin romper grupos API.

### Auth (documentación, sin cambio de código en este ticket)
- `POST /SGR/AuthService/RefreshToken` → **401** en `/login` sin cookie `rt` es **esperado** (bootstrap de sesión en `AuthProvider`).

## Fuera de alcance

- Cambiar `SameSite` de cookie refresh o unificar dominios SPA/API.
- Renombrar label «Pases QR» → «Visitas» (opcional futuro).

## Criterios de aceptación

- [x] **CA-1** Residente ve encuestas activas con título e IDs válidos en URL.
- [x] **CA-2** Residente puede enviar encuesta con preguntas «Texto libre».
- [x] **CA-3** Resultados encuesta no devuelven 500 por agregación SQL.
- [x] **CA-4** Crear ticket residente no devuelve 500 por canal legacy ausente.
- [x] **CA-5** Sidebar residente incluye `/visitas/pases` (Web y/o SQL prod).
- [x] **CA-6** Tipo ID en `/visitas/pases` es combo con nombres de catálogo.
- [x] **CA-7** SDD: spec/design/impl/delta + inventario SQL + changelog specs.

## Dependencias

- [[FE-ENC-RES-001]], [[FE-MOD-ENC-001]], [[FE-CRUD-004]], [[FE-VTS-PASE-001]], [[NAV-ROOT-001]]
- Scripts: `SQL/20261030_sgr_visitas_pases_menu_residente.sql`; deploy GraphApi + Web
