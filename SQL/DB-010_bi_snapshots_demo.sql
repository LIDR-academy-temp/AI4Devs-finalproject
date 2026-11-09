/*
  BI-RPT-001 — datos demo para gráficas de tendencias (6 anclas mensuales).

  Idempotente: soft-delete previo demo + INSERT.
  Ajusta @CondominioId si tu seed no usa 1.

  sqlcmd -S localhost -E -d CuartaQuinientos -b -I -f 65001 -i SQL/DB-010_bi_snapshots_demo.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;

DECLARE @CondominioId int = 1;
DECLARE @Now datetime = SYSUTCDATETIME();

IF OBJECT_ID(N'bi.KpiSnapshots', N'U') IS NULL
BEGIN
    RAISERROR(N'Ejecutar DB-010_bi_kpi_snapshots.sql primero.', 16, 1);
    RETURN;
END;

BEGIN TRAN;

UPDATE bi.KpiSnapshots
   SET bEliminado = 1,
       Modificado = N'demo-bi-rpt-001',
       FechaModificacion = @Now
 WHERE CondominioID = @CondominioId
   AND Fecha IN (
       CAST(N'2026-06-04' AS date), CAST(N'2026-07-04' AS date), CAST(N'2026-08-04' AS date),
       CAST(N'2026-09-04' AS date), CAST(N'2026-10-04' AS date), CAST(N'2026-11-04' AS date))
   AND bEliminado = 0;

UPDATE bi.KpiSnapshots
   SET bEliminado = 1,
       Modificado = N'demo-bi-rpt-001',
       FechaModificacion = @Now
 WHERE CondominioID = @CondominioId
   AND Creado = N'demo-bi-rpt-001'
   AND bEliminado = 0;

;WITH Demo AS (
    SELECT *
      FROM (VALUES
        (CAST(N'2026-06-04' AS date), 4, 2, 18.0, 42000.00, 8500.00, 3, 24, 20),
        (CAST(N'2026-07-04' AS date), 5, 3, 16.5, 44500.00, 9200.00, 2, 24, 21),
        (CAST(N'2026-08-04' AS date), 3, 4, 14.0, 46000.00, 7800.00, 4, 24, 21),
        (CAST(N'2026-09-04' AS date), 6, 2, 20.0, 43800.00, 10100.00, 3, 24, 22),
        (CAST(N'2026-10-04' AS date), 2, 5, 12.0, 47200.00, 8900.00, 1, 24, 22),
        (CAST(N'2026-11-04' AS date), 7, 1, 22.0, 41500.00, 9500.00, 2, 24, 23)
      ) v(Fecha, TicketsAbiertos, TicketsCerrados, TiempoMedioResolucionHoras,
          IngresosMXN, EgresosMXN, ResidentesMorosos, CasasTotales, CasasOcupadas)
)
INSERT INTO bi.KpiSnapshots
    (CondominioID, Fecha, TicketsAbiertos, TicketsCerrados, TiempoMedioResolucionHoras,
     IngresosMXN, EgresosMXN, ResidentesMorosos, CasasTotales, CasasOcupadas,
     Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
SELECT @CondominioId, d.Fecha, d.TicketsAbiertos, d.TicketsCerrados, d.TiempoMedioResolucionHoras,
       d.IngresosMXN, d.EgresosMXN, d.ResidentesMorosos, d.CasasTotales, d.CasasOcupadas,
       N'demo-bi-rpt-001', 0, @Now, 0
  FROM Demo d;

COMMIT;

SELECT COUNT(*) AS SnapshotsDemo
  FROM bi.KpiSnapshots WITH (NOLOCK)
 WHERE CondominioID = @CondominioId AND Creado = N'demo-bi-rpt-001' AND bEliminado = 0;
GO
