/*
  DB-010 — BI-RPT-001: esquema bi + tabla bi.KpiSnapshots (estado final BI-RPT-001)

  Prod greenfield: no existe schema bi → crea todo.
  BDs parciales: crea tabla si falta y ALTER de columnas extendidas si faltan.

  Sin vistas ni stored procedures (ADR-001: KPI vía GraphApi + Dapper).

  Prerrequisito: sgr.Condominios (FK CondominioID).

  sqlcmd -S <server> -d CuartaQuinientos -E -b -I -f 65001 -i SQL/DB-010_bi_kpi_snapshots.sql

  Después (menú, si FE-NAV-ENT1): SQL/20261104_sgr_menus_bi_rpt_reactivate.sql
*/
SET NOCOUNT ON;
SET XACT_ABORT ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_NULLS ON;
GO

IF SCHEMA_ID(N'bi') IS NULL
BEGIN
    EXEC(N'CREATE SCHEMA [bi] AUTHORIZATION [dbo];');
    PRINT N'Schema [bi] creado.';
END
ELSE
    PRINT N'Schema [bi] ya existe.';
GO

IF OBJECT_ID(N'bi.KpiSnapshots', N'U') IS NULL
BEGIN
    CREATE TABLE [bi].[KpiSnapshots] (
        [SnapshotID]                  int             IDENTITY(1, 1) NOT NULL,
        [CondominioID]                int             NOT NULL,
        [Fecha]                       date            NOT NULL,
        [TicketsAbiertos]             int             NOT NULL
            CONSTRAINT [DF_bi_KpiSnapshots_TicketsAbiertos] DEFAULT ((0)),
        [TicketsCerrados]             int             NOT NULL
            CONSTRAINT [DF_bi_KpiSnapshots_TicketsCerrados] DEFAULT ((0)),
        [TiempoMedioResolucionHoras]  decimal(18, 2)  NOT NULL
            CONSTRAINT [DF_bi_KpiSnapshots_TiempoMedioResolucionHoras] DEFAULT ((0)),
        [IngresosMXN]                 decimal(18, 2)  NOT NULL
            CONSTRAINT [DF_bi_KpiSnapshots_IngresosMXN] DEFAULT ((0)),
        [EgresosMXN]                  decimal(18, 2)  NOT NULL
            CONSTRAINT [DF_bi_KpiSnapshots_EgresosMXN] DEFAULT ((0)),
        [ResidentesMorosos]           int             NOT NULL
            CONSTRAINT [DF_bi_KpiSnapshots_ResidentesMorosos] DEFAULT ((0)),
        [CasasTotales]                int             NOT NULL
            CONSTRAINT [DF_bi_KpiSnapshots_CasasTotales] DEFAULT ((0)),
        [CasasOcupadas]               int             NOT NULL
            CONSTRAINT [DF_bi_KpiSnapshots_CasasOcupadas] DEFAULT ((0)),
        [Creado]                      nvarchar(100)   NOT NULL,
        [Modificado]                  nvarchar(100)   NULL,
        [UsuarioCreacionID]           int             NOT NULL,
        [UsuarioModificacionID]       int             NULL,
        [FechaCreacion]               datetime        NOT NULL
            CONSTRAINT [DF_bi_KpiSnapshots_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
        [FechaModificacion]           datetime        NULL,
        [bEliminado]                  bit             NOT NULL
            CONSTRAINT [DF_bi_KpiSnapshots_bEliminado] DEFAULT ((0)),
        CONSTRAINT [pk_bi_KpiSnapshots] PRIMARY KEY CLUSTERED ([SnapshotID] ASC),
        CONSTRAINT [FK_bi_KpiSnapshots_Condominio] FOREIGN KEY ([CondominioID])
            REFERENCES [sgr].[Condominios] ([CondominioID])
    );

    PRINT N'Tabla bi.KpiSnapshots creada.';
END
ELSE
    PRINT N'Tabla bi.KpiSnapshots ya existe.';
GO

IF COL_LENGTH(N'bi.KpiSnapshots', N'TiempoMedioResolucionHoras') IS NULL
BEGIN
    ALTER TABLE bi.KpiSnapshots ADD TiempoMedioResolucionHoras DECIMAL(18, 2) NOT NULL
        CONSTRAINT DF_bi_KpiSnapshots_TiempoMedioResolucionHoras DEFAULT (0);
    PRINT N'Columna TiempoMedioResolucionHoras agregada.';
END
GO

IF COL_LENGTH(N'bi.KpiSnapshots', N'CasasTotales') IS NULL
BEGIN
    ALTER TABLE bi.KpiSnapshots ADD CasasTotales INT NOT NULL
        CONSTRAINT DF_bi_KpiSnapshots_CasasTotales DEFAULT (0);
    PRINT N'Columna CasasTotales agregada.';
END
GO

IF COL_LENGTH(N'bi.KpiSnapshots', N'CasasOcupadas') IS NULL
BEGIN
    ALTER TABLE bi.KpiSnapshots ADD CasasOcupadas INT NOT NULL
        CONSTRAINT DF_bi_KpiSnapshots_CasasOcupadas DEFAULT (0);
    PRINT N'Columna CasasOcupadas agregada.';
END
GO

IF NOT EXISTS (
    SELECT 1
      FROM sys.indexes i
     WHERE i.object_id = OBJECT_ID(N'bi.KpiSnapshots')
       AND i.name = N'UX_bi_KpiSnapshots_Condominio_Fecha'
)
BEGIN
    CREATE UNIQUE NONCLUSTERED INDEX [UX_bi_KpiSnapshots_Condominio_Fecha]
        ON [bi].[KpiSnapshots] ([CondominioID], [Fecha])
        WHERE [bEliminado] = 0;
    PRINT N'Índice UX_bi_KpiSnapshots_Condominio_Fecha creado.';
END
ELSE
    PRINT N'Índice UX_bi_KpiSnapshots_Condominio_Fecha ya existe.';
GO

PRINT N'DB-010 bi.KpiSnapshots completado (schema bi; sin vistas/SP).';
GO

SELECT N'Check DB-010 bi' AS CheckId,
       s.name AS SchemaName,
       t.name AS TableName,
       c.name AS ColumnName,
       ty.name AS DataType
  FROM sys.tables t
  INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
  INNER JOIN sys.columns c ON c.object_id = t.object_id
  INNER JOIN sys.types ty ON ty.user_type_id = c.user_type_id
 WHERE s.name = N'bi' AND t.name = N'KpiSnapshots'
   AND c.name IN (
       N'TiempoMedioResolucionHoras', N'CasasTotales', N'CasasOcupadas',
       N'TicketsAbiertos', N'IngresosMXN', N'EgresosMXN')
 ORDER BY c.column_id;
GO
