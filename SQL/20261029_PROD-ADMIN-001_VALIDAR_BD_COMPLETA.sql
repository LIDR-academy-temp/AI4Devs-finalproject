/*
  PROD-ADMIN-001 / auditoría BD — ¿está completa para el portal (Entrega 1)?
  Ejecutar en la MISMA base que usa la API (appsettings.Production.json).

  Severidad:
    BLOQUEANTE  → módulo admin/residente falla sin esto
    LEGACY_OK   → falta vs readme pero la API tiene compat (no script DB-001 en prod legacy)
    OPCIONAL    → mejora; no impide operación básica
*/
SET NOCOUNT ON;

PRINT N'=== VALIDAR BD COMPLETA ===';
PRINT N'Base: ' + DB_NAME();
PRINT N'Fecha servidor: ' + CONVERT(nvarchar(30), SYSUTCDATETIME(), 126);
PRINT N'';

-- ── 1. Tablas críticas (Entrega 1 — readme dominios) ─────────────────────
DECLARE @Tablas TABLE (
    Dominio     nvarchar(10)  NOT NULL,
    Objeto      nvarchar(128) NOT NULL,
    Severidad   nvarchar(12)  NOT NULL,
    AccionSiFalta nvarchar(400) NOT NULL
);

INSERT @Tablas (Dominio, Objeto, Severidad, AccionSiFalta) VALUES
-- SGR
(N'SGR', N'sgr.Usuarios',           N'BLOQUEANTE', N'BD base / cuartaquinientos_schema.sql'),
(N'SGR', N'sgr.Perfiles',           N'BLOQUEANTE', N'cuartaquinientos_schema.sql + seeds DB-002'),
(N'SGR', N'sgr.RefreshTokens',      N'BLOQUEANTE', N'DB-009_fix_views_y_tablas.sql'),
(N'SGR', N'sgr.Menus',              N'BLOQUEANTE', N'DB-007_sgr_menus_seed.sql (estructura en schema)'),
(N'SGR', N'sgr.PerfilMenus',        N'BLOQUEANTE', N'DB-007_sgr_menus_seed.sql'),
(N'SGR', N'sgr.Casas',              N'BLOQUEANTE', N'schema + seeds'),
(N'SGR', N'sgr.Condominios',        N'BLOQUEANTE', N'schema + seeds'),
(N'SGR', N'sgr.CasaOcupantes',      N'OPCIONAL',   N'Casa por ocupante; API usa fallback propietario'),
-- TKT
(N'TKT', N'tkt.Tickets',            N'BLOQUEANTE', N'schema'),
(N'TKT', N'tkt.EstadosTickets',     N'BLOQUEANTE', N'schema + DB-002'),
(N'TKT', N'tkt.CanalesTicket',      N'LEGACY_OK',  N'Catálogo tickets extendido; prod legacy puede omitir'),
(N'TKT', N'tkt.CategoriasTicket',   N'LEGACY_OK',  N'No ejecutar DB-001 en prod legacy'),
(N'TKT', N'tkt.PrioridadesTicket',  N'BLOQUEANTE', N'schema (nombre alterno: tkt.PrioridadEstickets)'),
-- FNZ
(N'FNZ', N'fnz.Cuentas',            N'BLOQUEANTE', N'schema + DB-002'),
(N'FNZ', N'fnz.Cuotas',             N'BLOQUEANTE', N'schema'),
(N'FNZ', N'fnz.Transacciones',      N'BLOQUEANTE', N'schema'),
(N'FNZ', N'fnz.TiposMovimiento',    N'BLOQUEANTE', N'DB-002'),
-- ANM / ENC / JNT
(N'ANM', N'anm.Anuncios',           N'BLOQUEANTE', N'schema'),
(N'ANM', N'anm.TiposAnuncio',        N'BLOQUEANTE', N'schema; seed DB-003 si vacío'),
(N'ENC', N'enc.Encuestas',          N'BLOQUEANTE', N'schema'),
(N'ENC', N'enc.Preguntas',          N'BLOQUEANTE', N'schema'),
(N'ENC', N'enc.OpcionesPregunta',   N'BLOQUEANTE', N'schema'),
(N'ENC', N'enc.Respuestas',         N'BLOQUEANTE', N'schema'),
(N'ENC', N'enc.TiposPregunta',      N'BLOQUEANTE', N'DB-004 seed si vacío'),
(N'JNT', N'jnt.Juntas',             N'BLOQUEANTE', N'schema'),
(N'JNT', N'jnt.JuntaDetalle',        N'BLOQUEANTE', N'schema'),
-- VTS
(N'VTS', N'vts.Visitas',            N'BLOQUEANTE', N'schema'),
(N'VTS', N'vts.VisitasGeneradas',   N'BLOQUEANTE', N'schema'),
(N'VTS', N'vts.AreasComunes',       N'BLOQUEANTE', N'schema'),
(N'VTS', N'vts.ReservacionesArea',  N'BLOQUEANTE', N'schema'),
(N'VTS', N'vts.TipoIdentificacion', N'BLOQUEANTE', N'DB-008 seed'),
-- USR
(N'USR', N'usr.Automoviles',        N'BLOQUEANTE', N'schema'),
(N'USR', N'usr.Mascotas',           N'BLOQUEANTE', N'schema'),
(N'USR', N'usr.Marcas',             N'BLOQUEANTE', N'schema'),
(N'USR', N'usr.Modelos',            N'BLOQUEANTE', N'schema'),
(N'USR', N'usr.TiposMascota',       N'BLOQUEANTE', N'schema'),
(N'USR', N'usr.RazasMascota',       N'BLOQUEANTE', N'schema'),
-- ARC / WMS / NTF
(N'ARC', N'arc.Archivos',           N'BLOQUEANTE', N'schema'),
(N'ARC', N'arc.TiposArchivo',       N'BLOQUEANTE', N'schema'),
(N'WMS', N'wms.Articulos',          N'BLOQUEANTE', N'DB-005_wms_schema.sql'),
(N'WMS', N'wms.CategoriasArticulo', N'BLOQUEANTE', N'DB-005_wms_schema.sql'),
(N'WMS', N'wms.Prestamos',          N'OPCIONAL',   N'DB-005 (préstamos almacén)'),
(N'NTF', N'ntf.Notificaciones',     N'BLOQUEANTE', N'schema'),
(N'NTF', N'ntf.TiposNotificacion',  N'BLOQUEANTE', N'DB-002'),
(N'NTF', N'ntf.NotificacionesEntrega', N'BLOQUEANTE', N'schema (Telegram/outbox)');

SELECT
    t.Dominio,
    t.Objeto,
    CASE
        WHEN t.Objeto = N'tkt.PrioridadesTicket'
             AND OBJECT_ID(N'tkt.PrioridadesTicket', N'U') IS NULL
             AND OBJECT_ID(N'tkt.PrioridadEstickets', N'U') IS NOT NULL
        THEN N'OK (PrioridadEstickets)'
        WHEN OBJECT_ID(t.Objeto, N'U') IS NOT NULL THEN N'OK'
        ELSE N'FALTA'
    END AS Resultado,
    t.Severidad,
    CASE
        WHEN t.Objeto = N'tkt.PrioridadesTicket'
             AND OBJECT_ID(N'tkt.PrioridadesTicket', N'U') IS NULL
             AND OBJECT_ID(N'tkt.PrioridadEstickets', N'U') IS NOT NULL
        THEN N'—'
        WHEN OBJECT_ID(t.Objeto, N'U') IS NOT NULL THEN N'—'
        ELSE t.AccionSiFalta
    END AS AccionSiFalta
FROM @Tablas t
ORDER BY
    CASE
        WHEN t.Objeto = N'tkt.PrioridadesTicket'
             AND OBJECT_ID(N'tkt.PrioridadesTicket', N'U') IS NULL
             AND OBJECT_ID(N'tkt.PrioridadEstickets', N'U') IS NOT NULL
        THEN 1
        WHEN OBJECT_ID(t.Objeto, N'U') IS NOT NULL THEN 1
        ELSE 0
    END,
    t.Severidad,
    t.Dominio,
    t.Objeto;

-- ── 2. Vistas / columnas contrato API ─────────────────────────────────────
PRINT N'';
PRINT N'--- Contratos API (vistas / columnas) ---';

SELECT
    c.CheckId,
    c.Resultado,
    c.Severidad,
    c.AccionSiFalta
FROM (
    VALUES
        (N'arc.vsArchivos existe',
         CASE WHEN OBJECT_ID(N'arc.vsArchivos', N'V') IS NOT NULL THEN N'OK' ELSE N'FALTA' END,
         N'BLOQUEANTE', N'cuartaquinientos_schema.sql o recrear vista'),

        (N'arc.vsArchivos.FechaCreacion',
         CASE WHEN COL_LENGTH(N'arc.vsArchivos', N'FechaCreacion') IS NOT NULL THEN N'OK' ELSE N'FALTA' END,
         N'BLOQUEANTE', N'DB-006_arc_vsarchivos_fechacreacion.sql'),

        (N'sgr.vsUsuarios',
         CASE WHEN OBJECT_ID(N'sgr.vsUsuarios', N'V') IS NOT NULL THEN N'OK' ELSE N'FALTA' END,
         N'BLOQUEANTE', N'DB-009_fix_views_y_tablas.sql'),

        (N'usr.vsMascotas',
         CASE WHEN OBJECT_ID(N'usr.vsMascotas', N'V') IS NOT NULL THEN N'OK' ELSE N'FALTA' END,
         N'LEGACY_OK', N'DB-009 (CuartaMascotas usa tablas directo)'),

        (N'usr.vsAutomoviles',
         CASE WHEN OBJECT_ID(N'usr.vsAutomoviles', N'V') IS NOT NULL THEN N'OK' ELSE N'FALTA' END,
         N'LEGACY_OK', N'DB-009 (CuartaAutomoviles usa tablas directo)'),

        (N'tkt.vsTickets',
         CASE WHEN OBJECT_ID(N'tkt.vsTickets', N'V') IS NOT NULL THEN N'OK' ELSE N'FALTA' END,
         N'BLOQUEANTE', N'DB-009'),

        (N'sgr.Usuarios.Nombre (post DB-001)',
         CASE WHEN COL_LENGTH(N'sgr.Usuarios', N'Nombre') IS NOT NULL THEN N'OK'
              WHEN COL_LENGTH(N'sgr.Usuarios', N'NombreUsuario') IS NOT NULL THEN N'OK (legacy)'
              ELSE N'FALTA' END,
         N'BLOQUEANTE', N'Revisar tabla sgr.Usuarios'),

        (N'enc.Respuestas.EncuestaID',
         CASE WHEN COL_LENGTH(N'enc.Respuestas', N'EncuestaID') IS NOT NULL THEN N'OK'
              ELSE N'LEGACY (JOIN vía Pregunta)' END,
         N'LEGACY_OK', N'Redeploy API; no DB-001 en prod'),

        (N'usr.Mascotas.VacunasAlDia',
         CASE WHEN COL_LENGTH(N'usr.Mascotas', N'VacunasAlDia') IS NOT NULL THEN N'OK' ELSE N'FALTA' END,
         N'OPCIONAL', N'20261029_PROD-ADMIN-001_opcional_vacunas.sql'),

        (N'usr.Automoviles.ModeloLibre',
         CASE WHEN COL_LENGTH(N'usr.Automoviles', N'ModeloLibre') IS NOT NULL THEN N'OK' ELSE N'FALTA' END,
         N'OPCIONAL', N'Columna en schema; alta sin texto libre sigue funcionando')
) AS c(CheckId, Resultado, Severidad, AccionSiFalta)
ORDER BY
    CASE WHEN c.Resultado IN (N'FALTA', N'LEGACY (JOIN vía Pregunta)') THEN 0 ELSE 1 END,
    c.CheckId;

-- ── 3. Resumen ejecutivo ───────────────────────────────────────────────────
PRINT N'';
PRINT N'--- Resumen ---';

DECLARE @bloq int = (
    SELECT COUNT(*)
    FROM @Tablas t
    WHERE t.Severidad = N'BLOQUEANTE'
      AND NOT (
          t.Objeto = N'tkt.PrioridadesTicket'
          AND OBJECT_ID(N'tkt.PrioridadEstickets', N'U') IS NOT NULL
      )
      AND OBJECT_ID(t.Objeto, N'U') IS NULL
);

DECLARE @bloqVista int = 0;
IF OBJECT_ID(N'arc.vsArchivos', N'V') IS NULL SET @bloqVista += 1;
IF COL_LENGTH(N'arc.vsArchivos', N'FechaCreacion') IS NULL SET @bloqVista += 1;
IF OBJECT_ID(N'sgr.vsUsuarios', N'V') IS NULL SET @bloqVista += 1;
IF OBJECT_ID(N'tkt.vsTickets', N'V') IS NULL SET @bloqVista += 1;

SELECT
    @bloq AS TablasBloqueantesFaltantes,
    @bloqVista AS ContratosVistaBloqueantesFaltantes,
    CASE WHEN @bloq = 0 AND @bloqVista = 0 THEN N'LISTA PARA APP (SQL estructura)'
         WHEN @bloq = 0 THEN N'PARCIAL — revisar vistas/columnas BLOQUEANTE arriba'
         ELSE N'INCOMPLETA — crear tablas faltantes (schema o script indicado)'
    END AS Veredicto;

PRINT N'';
PRINT N'Scripts idempotentes habituales en prod (post DB-009):';
PRINT N'  20261029_PROD-ADMIN-001_APLICAR_FALTANTES.sql  (WMS + arc.vsArchivos)';
PRINT N'  20261029_PROD-ADMIN-001_opcional_vacunas.sql   (solo si quieres VacunasAlDia)';
PRINT N'No ejecutar DB-001 en prod legacy.';
