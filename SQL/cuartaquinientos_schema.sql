/*
  CuartaQuinientos — esquema completo (fuente de verdad SQL del proyecto)
  Ejecutar en SQL Server (sqlcmd o SSMS)
  Ver SQL/README.md
*/
GO
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF DB_NAME() IN (N'master', N'model', N'msdb', N'tempdb')
BEGIN
    RAISERROR(N'Ejecutar sobre la BD CuartaQuinientos (sqlcmd -d), no en BD de sistema.', 16, 1);
    SET NOEXEC ON;
END
GO
IF SCHEMA_ID(N'sgr') IS NULL EXEC (N'CREATE SCHEMA [sgr]');
GO
IF SCHEMA_ID(N'tkt') IS NULL EXEC (N'CREATE SCHEMA [tkt]');
GO
IF SCHEMA_ID(N'fnz') IS NULL EXEC (N'CREATE SCHEMA [fnz]');
GO
IF SCHEMA_ID(N'ntf') IS NULL EXEC (N'CREATE SCHEMA [ntf]');
GO
IF SCHEMA_ID(N'usr') IS NULL EXEC (N'CREATE SCHEMA [usr]');
GO
IF SCHEMA_ID(N'vts') IS NULL EXEC (N'CREATE SCHEMA [vts]');
GO
IF SCHEMA_ID(N'enc') IS NULL EXEC (N'CREATE SCHEMA [enc]');
GO
IF SCHEMA_ID(N'jnt') IS NULL EXEC (N'CREATE SCHEMA [jnt]');
GO
IF SCHEMA_ID(N'anm') IS NULL EXEC (N'CREATE SCHEMA [anm]');
GO
IF SCHEMA_ID(N'arc') IS NULL EXEC (N'CREATE SCHEMA [arc]');
GO
IF SCHEMA_ID(N'api') IS NULL EXEC (N'CREATE SCHEMA [api]');
GO
IF SCHEMA_ID(N'bot') IS NULL EXEC (N'CREATE SCHEMA [bot]');
GO
IF SCHEMA_ID(N'ia') IS NULL EXEC (N'CREATE SCHEMA [ia]');
GO
IF SCHEMA_ID(N'bi') IS NULL EXEC (N'CREATE SCHEMA [bi]');
GO
IF SCHEMA_ID(N'wms') IS NULL EXEC (N'CREATE SCHEMA [wms]');
GO
/*
  CuartaQuinientos — esquema completo (fuente de verdad SQL del proyecto)
  Ejecutar en SQL Server (sqlcmd o SSMS)
  Ver SQL/README.md
*/
GO
SET ANSI_NULLS ON;
GO
SET QUOTED_IDENTIFIER ON;
GO

IF DB_NAME() IN (N'master', N'model', N'msdb', N'tempdb')
BEGIN
    RAISERROR(N'Ejecutar sobre la BD CuartaQuinientos (sqlcmd -d), no en BD de sistema.', 16, 1);
    SET NOEXEC ON;
END
GO
IF SCHEMA_ID(N'sgr') IS NULL EXEC (N'CREATE SCHEMA [sgr]');
GO
IF SCHEMA_ID(N'tkt') IS NULL EXEC (N'CREATE SCHEMA [tkt]');
GO
IF SCHEMA_ID(N'fnz') IS NULL EXEC (N'CREATE SCHEMA [fnz]');
GO
IF SCHEMA_ID(N'ntf') IS NULL EXEC (N'CREATE SCHEMA [ntf]');
GO
IF SCHEMA_ID(N'usr') IS NULL EXEC (N'CREATE SCHEMA [usr]');
GO
IF SCHEMA_ID(N'vts') IS NULL EXEC (N'CREATE SCHEMA [vts]');
GO
IF SCHEMA_ID(N'enc') IS NULL EXEC (N'CREATE SCHEMA [enc]');
GO
IF SCHEMA_ID(N'jnt') IS NULL EXEC (N'CREATE SCHEMA [jnt]');
GO
IF SCHEMA_ID(N'anm') IS NULL EXEC (N'CREATE SCHEMA [anm]');
GO
IF SCHEMA_ID(N'arc') IS NULL EXEC (N'CREATE SCHEMA [arc]');
GO
IF SCHEMA_ID(N'api') IS NULL EXEC (N'CREATE SCHEMA [api]');
GO
IF SCHEMA_ID(N'bot') IS NULL EXEC (N'CREATE SCHEMA [bot]');
GO
IF SCHEMA_ID(N'ia') IS NULL EXEC (N'CREATE SCHEMA [ia]');
GO
IF SCHEMA_ID(N'bi') IS NULL EXEC (N'CREATE SCHEMA [bi]');
GO
IF SCHEMA_ID(N'wms') IS NULL EXEC (N'CREATE SCHEMA [wms]');
GO
IF OBJECT_ID(N'anm.TiposAnuncio', N'U') IS NULL
BEGIN
CREATE TABLE [anm].[TiposAnuncio] (
[TipoAnuncioID] int IDENTITY(1, 1) NOT NULL,
[TipoAnuncio] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_anm_TiposAnuncio] PRIMARY KEY CLUSTERED ([TipoAnuncioID] ASC),
CONSTRAINT [UQ_anm_TiposAnuncio_TipoAnuncio] UNIQUE NONCLUSTERED ([TipoAnuncio] ASC)
);
END
GO
IF OBJECT_ID(N'api.UsuariosAPI', N'U') IS NULL
BEGIN
CREATE TABLE [api].[UsuariosAPI] (
[UsuariosAPI] int IDENTITY(1, 1) NOT NULL,
[NombreUsuario] nvarchar(100) NOT NULL,
[Password] nvarchar(100) NOT NULL,
[bActivo] bit NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
CONSTRAINT [pk_api_UsuariosAPI] PRIMARY KEY CLUSTERED ([UsuariosAPI] ASC)
);
END
GO
IF OBJECT_ID(N'arc.TiposArchivo', N'U') IS NULL
BEGIN
CREATE TABLE [arc].[TiposArchivo] (
[TipoArchivoID] int IDENTITY(1, 1) NOT NULL,
[TipoArchivo] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_arc_TiposArchivo] PRIMARY KEY CLUSTERED ([TipoArchivoID] ASC),
CONSTRAINT [UQ_arc_TiposArchivo_TipoArchivo] UNIQUE NONCLUSTERED ([TipoArchivo] ASC)
);
END
GO
IF OBJECT_ID(N'dbo.descripciontablas', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[descripciontablas] (
[Esquema] nvarchar(50) NULL,
[Tabla] nvarchar(56) NULL,
[Descripcion] nvarchar(78) NULL);
END
GO
IF OBJECT_ID(N'dbo.descrpcionescampos', N'U') IS NULL
BEGIN
CREATE TABLE [dbo].[descrpcionescampos] (
[Esquema] nvarchar(500) NULL,
[Tabla] nvarchar(560) NULL,
[Columna] nvarchar(550) NULL,
[Descripcion] nvarchar(75) NULL);
END
GO
IF OBJECT_ID(N'enc.Encuestas', N'U') IS NULL
BEGIN
CREATE TABLE [enc].[Encuestas] (
[EncuestaID] int IDENTITY(1, 1) NOT NULL,
[Titulo] nvarchar(200) NOT NULL,
[Descripcion] nvarchar(500) NULL,
[FechaInicio] datetime NOT NULL,
[FechaFin] datetime NULL,
[bActivo] bit NOT NULL DEFAULT ((1)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_enc_Encuestas] PRIMARY KEY CLUSTERED ([EncuestaID] ASC)
);
END
GO
IF OBJECT_ID(N'enc.TiposPregunta', N'U') IS NULL
BEGIN
CREATE TABLE [enc].[TiposPregunta] (
[TipoPreguntaID] int IDENTITY(1, 1) NOT NULL,
[TipoPregunta] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_enc_TiposPregunta] PRIMARY KEY CLUSTERED ([TipoPreguntaID] ASC),
CONSTRAINT [UQ_enc_TiposPregunta_TipoPregunta] UNIQUE NONCLUSTERED ([TipoPregunta] ASC)
);
END
GO
IF OBJECT_ID(N'fnz.TiposMovimiento', N'U') IS NULL
BEGIN
CREATE TABLE [fnz].[TiposMovimiento] (
[TipoMovimientoID] int IDENTITY(1, 1) NOT NULL,
[TipoMovimiento] nvarchar(100) NOT NULL,
[bCargo] bit NOT NULL DEFAULT ((0)),
[bAbono] bit NOT NULL DEFAULT ((0)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_fnz_TiposMovimiento] PRIMARY KEY CLUSTERED ([TipoMovimientoID] ASC),
CONSTRAINT [UQ_fnz_TiposMovimiento_TipoMovimiento] UNIQUE NONCLUSTERED ([TipoMovimiento] ASC)
);
END
GO
IF OBJECT_ID(N'ia.Documentos', N'U') IS NULL
BEGIN
CREATE TABLE [ia].[Documentos] (
[DocumentoID]           int             IDENTITY(1, 1) NOT NULL,
[Titulo]                nvarchar(300)   NOT NULL,
[Fuente]                nvarchar(50)    NOT NULL,
[Contenido]             nvarchar(MAX)   NULL,
[Creado]                nvarchar(100)   NOT NULL,
[Modificado]            nvarchar(100)   NULL,
[UsuarioCreacionID]     int             NOT NULL,
[UsuarioModificacionID] int             NULL,
[FechaCreacion]         datetime        NOT NULL CONSTRAINT [DF_ia_Documentos_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
[FechaModificacion]     datetime        NULL,
[bEliminado]            bit             NOT NULL CONSTRAINT [DF_ia_Documentos_bEliminado] DEFAULT ((0)),
CONSTRAINT [pk_ia_Documentos] PRIMARY KEY CLUSTERED ([DocumentoID] ASC)
);
END
GO
IF OBJECT_ID(N'jnt.Juntas', N'U') IS NULL
BEGIN
CREATE TABLE [jnt].[Juntas] (
[JuntaID] int IDENTITY(1, 1) NOT NULL,
[Titulo] nvarchar(200) NOT NULL,
[Descripcion] nvarchar(500) NULL,
[FechaProgramada] datetime NOT NULL,
[Ubicacion] nvarchar(200) NULL,
[bActivo] bit NOT NULL DEFAULT ((1)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_jnt_Juntas] PRIMARY KEY CLUSTERED ([JuntaID] ASC)
);
END
GO
IF OBJECT_ID(N'ntf.TiposNotificacion', N'U') IS NULL
BEGIN
CREATE TABLE [ntf].[TiposNotificacion] (
[TipoNotificacionID] int IDENTITY(1, 1) NOT NULL,
[TipoNotiicfacion] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_ntf_TiposNotificacion] PRIMARY KEY CLUSTERED ([TipoNotificacionID] ASC),
CONSTRAINT [UQ_ntf_TiposNotificacion_TipoNotiicfacion] UNIQUE NONCLUSTERED ([TipoNotiicfacion] ASC)
);
END
GO
IF OBJECT_ID(N'sgr.Condominios', N'U') IS NULL
BEGIN
CREATE TABLE [sgr].[Condominios] (
[CondominioID] int IDENTITY(1, 1) NOT NULL,
[NombreCondominio] nvarchar(200) NOT NULL,
[DireccionCondominio] nvarchar(500) NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_sgr_Condominios] PRIMARY KEY CLUSTERED ([CondominioID] ASC)
);
END
GO
IF OBJECT_ID(N'sgr.Usuarios', N'U') IS NULL
BEGIN
CREATE TABLE [sgr].[Usuarios] (
[UsuarioID] int IDENTITY(1, 1) NOT NULL,
[CorreoUsuario] nvarchar(100) NOT NULL,
[PerfilID] int NULL,
[PasswordUsuario] nvarchar(500) NOT NULL,
[NombreUsuario] nvarchar(100) NOT NULL,
[bActivoUsuario] bit NOT NULL DEFAULT ((1)),
[TelefonoUsuario] nvarchar(50) NULL,
[FotoUrlUsuario] nvarchar(500) NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
[bActualizarPassword] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_sgr_Usuarios] PRIMARY KEY CLUSTERED ([UsuarioID] ASC),
CONSTRAINT [UQ_sgr_Usuarios_CorreoUsuario] UNIQUE NONCLUSTERED ([CorreoUsuario] ASC)
);
END
GO
IF OBJECT_ID(N'tkt.CanalesTicket', N'U') IS NULL
BEGIN
CREATE TABLE [tkt].[CanalesTicket] (
[CanalID] int IDENTITY(1, 1) NOT NULL,
[Canal] nvarchar(20) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_tkt_CanalesTicket] PRIMARY KEY CLUSTERED ([CanalID] ASC)
);
END
GO
IF OBJECT_ID(N'tkt.CategoriasTicket', N'U') IS NULL
BEGIN
CREATE TABLE [tkt].[CategoriasTicket] (
[CategoriaTicketID] int IDENTITY(1, 1) NOT NULL,
[CategoriaTicket] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_tkt_CategoriasTicket] PRIMARY KEY CLUSTERED ([CategoriaTicketID] ASC)
);
END
GO
IF OBJECT_ID(N'tkt.EstadosTickets', N'U') IS NULL
BEGIN
CREATE TABLE [tkt].[EstadosTickets] (
[EstadoTicketID] int IDENTITY(1, 1) NOT NULL,
[EstadoTicket] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_tkt_EstadosTickets] PRIMARY KEY CLUSTERED ([EstadoTicketID] ASC),
CONSTRAINT [UQ_tkt_EstadosTickets_EstadoTicket] UNIQUE NONCLUSTERED ([EstadoTicket] ASC)
);
END
GO
IF OBJECT_ID(N'tkt.PrioridadEstickets', N'U') IS NULL
BEGIN
CREATE TABLE [tkt].[PrioridadEstickets] (
[PrioridadTicketID] int IDENTITY(1, 1) NOT NULL,
[PrioridadTicket] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_tkt_PrioridadEstickets] PRIMARY KEY CLUSTERED ([PrioridadTicketID] ASC),
CONSTRAINT [UQ_tkt_PrioridadEstickets_PrioridadTicket] UNIQUE NONCLUSTERED ([PrioridadTicket] ASC)
);
END
GO
IF OBJECT_ID(N'usr.Marcas', N'U') IS NULL
BEGIN
CREATE TABLE [usr].[Marcas] (
[MarcaID] int IDENTITY(1, 1) NOT NULL,
[Marca] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [UQ_usr_Marcas_Marca] UNIQUE NONCLUSTERED ([Marca] ASC),
CONSTRAINT [pk_usr_Marcas] PRIMARY KEY CLUSTERED ([MarcaID] ASC)
);
END
GO
IF OBJECT_ID(N'usr.Parentescos', N'U') IS NULL
BEGIN
CREATE TABLE [usr].[Parentescos] (
[ParentescoID] int IDENTITY(1, 1) NOT NULL,
[Parentesco] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_usr_Parentescos] PRIMARY KEY CLUSTERED ([ParentescoID] ASC),
CONSTRAINT [UQ_usr_Parentescos_Parentesco] UNIQUE NONCLUSTERED ([Parentesco] ASC)
);
END
GO
IF OBJECT_ID(N'usr.TiposMascota', N'U') IS NULL
BEGIN
CREATE TABLE [usr].[TiposMascota] (
[TipoMascotaID] int IDENTITY(1, 1) NOT NULL,
[TipoMascota] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_usr_TiposMascota] PRIMARY KEY CLUSTERED ([TipoMascotaID] ASC),
CONSTRAINT [UQ_usr_TiposMascota_TipoMascota] UNIQUE NONCLUSTERED ([TipoMascota] ASC)
);
END
GO
IF OBJECT_ID(N'vts.AreasComunes', N'U') IS NULL
BEGIN
CREATE TABLE [vts].[AreasComunes] (
[AreasComunesID] int IDENTITY(1, 1) NOT NULL,
[AreasComunes] nvarchar(150) NOT NULL,
[DescripcionAreasComunes] nvarchar(500) NULL,
[Capacidad] int NULL,
[RequiereReservacion] bit NOT NULL DEFAULT ((0)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_vts_AreasComunes] PRIMARY KEY CLUSTERED ([AreasComunesID] ASC)
);
END
GO
IF OBJECT_ID(N'vts.ReservacionesEstados', N'U') IS NULL
BEGIN
CREATE TABLE [vts].[ReservacionesEstados] (
[ReservacionEstadoID] int IDENTITY(1, 1) NOT NULL,
[ReservacionEstado] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_vts_ReservacionesEstados] PRIMARY KEY CLUSTERED ([ReservacionEstadoID] ASC),
CONSTRAINT [UQ_vts_ReservacionesEstados_ReservacionEstado] UNIQUE NONCLUSTERED ([ReservacionEstado] ASC)
);
END
GO
IF OBJECT_ID(N'vts.TipoIdentificacion', N'U') IS NULL
BEGIN
CREATE TABLE [vts].[TipoIdentificacion] (
[TipoIdentificacionID] int IDENTITY(1, 1) NOT NULL,
[TipoIdentificacion] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_vts_TipoIdentificacion] PRIMARY KEY CLUSTERED ([TipoIdentificacionID] ASC),
CONSTRAINT [UQ_vts_TipoIdentificacion_TipoIdentificacion] UNIQUE NONCLUSTERED ([TipoIdentificacion] ASC)
);
END
GO
IF OBJECT_ID(N'wms.CategoriasArticulo', N'U') IS NULL
BEGIN
CREATE TABLE [wms].[CategoriasArticulo] (
[CategoriaID]           int             IDENTITY(1, 1) NOT NULL,
[Nombre]                nvarchar(100)   NOT NULL,
[Creado]                nvarchar(100)   NOT NULL,
[Modificado]            nvarchar(100)   NULL,
[UsuarioCreacionID]     int             NOT NULL,
[UsuarioModificacionID] int             NULL,
[FechaCreacion]         datetime        NOT NULL CONSTRAINT [DF_wms_CategoriasArticulo_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
[FechaModificacion]     datetime        NULL,
[bEliminado]            bit             NOT NULL CONSTRAINT [DF_wms_CategoriasArticulo_bEliminado] DEFAULT ((0)),
CONSTRAINT [pk_wms_CategoriasArticulo] PRIMARY KEY CLUSTERED ([CategoriaID] ASC)
);
END
GO
IF OBJECT_ID(N'anm.Anuncios', N'U') IS NULL
BEGIN
CREATE TABLE [anm].[Anuncios] (
[AnuncioID] int IDENTITY(1, 1) NOT NULL,
[Titulo] nvarchar(200) NOT NULL,
[Contenido] nvarchar(MAX) NOT NULL,
[FechaPublicacion] datetime NOT NULL,
[VigenteHasta] datetime NULL,
[TipoAnuncioID] int NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_anm_Anuncios] PRIMARY KEY CLUSTERED ([AnuncioID] ASC),
CONSTRAINT [FK_anm_Anuncios_TipoAnuncioID] FOREIGN KEY ([TipoAnuncioID]) REFERENCES [anm].[TiposAnuncio] ([TipoAnuncioID])
);
END
GO
IF OBJECT_ID(N'arc.Archivos', N'U') IS NULL
BEGIN
CREATE TABLE [arc].[Archivos] (
[ArchivoID] int IDENTITY(1, 1) NOT NULL,
[Nombre] nvarchar(200) NOT NULL,
[Ruta] nvarchar(500) NOT NULL,
[TipoArchivoID] int NULL,
[EsPrivado] bit NOT NULL DEFAULT ((0)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_arc_Archivos] PRIMARY KEY CLUSTERED ([ArchivoID] ASC),
CONSTRAINT [FK_arc_Archivos_TipoArchivoID] FOREIGN KEY ([TipoArchivoID]) REFERENCES [arc].[TiposArchivo] ([TipoArchivoID])
);
END
GO
IF OBJECT_ID(N'enc.Preguntas', N'U') IS NULL
BEGIN
CREATE TABLE [enc].[Preguntas] (
[PreguntaID] int IDENTITY(1, 1) NOT NULL,
[EncuestaID] int NOT NULL,
[Texto] nvarchar(500) NOT NULL,
[TipoPreguntaID] int NOT NULL,
[Orden] int NOT NULL,
[Requerida] bit NOT NULL DEFAULT ((0)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_enc_Preguntas] PRIMARY KEY CLUSTERED ([PreguntaID] ASC),
CONSTRAINT [FK_enc_Preguntas_EncuestaID] FOREIGN KEY ([EncuestaID]) REFERENCES [enc].[Encuestas] ([EncuestaID]),
CONSTRAINT [FK_enc_Preguntas_TipoPreguntaID] FOREIGN KEY ([TipoPreguntaID]) REFERENCES [enc].[TiposPregunta] ([TipoPreguntaID])
);
END
GO
IF OBJECT_ID(N'ia.Fragmentos', N'U') IS NULL
BEGIN
CREATE TABLE [ia].[Fragmentos] (
[FragmentoID]           int             IDENTITY(1, 1) NOT NULL,
[DocumentoID]           int             NOT NULL,
[Texto]                 nvarchar(MAX)   NOT NULL,
[Embedding]             varbinary(MAX)  NULL,
[Creado]                nvarchar(100)   NOT NULL,
[Modificado]            nvarchar(100)   NULL,
[UsuarioCreacionID]     int             NOT NULL,
[UsuarioModificacionID] int             NULL,
[FechaCreacion]         datetime        NOT NULL CONSTRAINT [DF_ia_Fragmentos_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
[FechaModificacion]     datetime        NULL,
[bEliminado]            bit             NOT NULL CONSTRAINT [DF_ia_Fragmentos_bEliminado] DEFAULT ((0)),
CONSTRAINT [pk_ia_Fragmentos] PRIMARY KEY CLUSTERED ([FragmentoID] ASC),
CONSTRAINT [FK_ia_Fragmentos_Documento] FOREIGN KEY ([DocumentoID]) REFERENCES [ia].[Documentos] ([DocumentoID])
);
END
GO
IF OBJECT_ID(N'jnt.JuntaDetalle', N'U') IS NULL
BEGIN
CREATE TABLE [jnt].[JuntaDetalle] (
[JuntaDetalleID] int IDENTITY(1, 1) NOT NULL,
[JuntaID] int NOT NULL,
[Contenido] nvarchar(MAX) NOT NULL,
[FechaRegistro] datetime NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_jnt_JuntaDetalle] PRIMARY KEY CLUSTERED ([JuntaDetalleID] ASC),
CONSTRAINT [FK_jnt_JuntaDetalle_JuntaID] FOREIGN KEY ([JuntaID]) REFERENCES [jnt].[Juntas] ([JuntaID])
);
END
GO
IF OBJECT_ID(N'bi.KpiSnapshots', N'U') IS NULL
BEGIN
CREATE TABLE [bi].[KpiSnapshots] (
[SnapshotID]            int             IDENTITY(1, 1) NOT NULL,
[CondominioID]          int             NOT NULL,
[Fecha]                 date            NOT NULL,
[TicketsAbiertos]       int             NOT NULL CONSTRAINT [DF_bi_KpiSnapshots_TicketsAbiertos] DEFAULT ((0)),
[TicketsCerrados]       int             NOT NULL CONSTRAINT [DF_bi_KpiSnapshots_TicketsCerrados] DEFAULT ((0)),
[IngresosMXN]           decimal(18, 2)  NOT NULL CONSTRAINT [DF_bi_KpiSnapshots_IngresosMXN] DEFAULT ((0)),
[EgresosMXN]            decimal(18, 2)  NOT NULL CONSTRAINT [DF_bi_KpiSnapshots_EgresosMXN] DEFAULT ((0)),
[ResidentesMorosos]     int             NOT NULL CONSTRAINT [DF_bi_KpiSnapshots_ResidentesMorosos] DEFAULT ((0)),
[Creado]                nvarchar(100)   NOT NULL,
[Modificado]            nvarchar(100)   NULL,
[UsuarioCreacionID]     int             NOT NULL,
[UsuarioModificacionID] int             NULL,
[FechaCreacion]         datetime        NOT NULL CONSTRAINT [DF_bi_KpiSnapshots_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
[FechaModificacion]     datetime        NULL,
[bEliminado]            bit             NOT NULL CONSTRAINT [DF_bi_KpiSnapshots_bEliminado] DEFAULT ((0)),
CONSTRAINT [pk_bi_KpiSnapshots] PRIMARY KEY CLUSTERED ([SnapshotID] ASC),
CONSTRAINT [FK_bi_KpiSnapshots_Condominio] FOREIGN KEY ([CondominioID]) REFERENCES [sgr].[Condominios] ([CondominioID])
);
CREATE UNIQUE NONCLUSTERED INDEX [UX_bi_KpiSnapshots_Condominio_Fecha]
    ON [bi].[KpiSnapshots] ([CondominioID], [Fecha])
    WHERE [bEliminado] = 0;
END
GO
IF OBJECT_ID(N'bot.Conversaciones', N'U') IS NULL
BEGIN
CREATE TABLE [bot].[Conversaciones] (
[ConversacionID]        int             IDENTITY(1, 1) NOT NULL,
[ChatId]                bigint          NOT NULL,
[UsuarioID]             int             NULL,
[EstadoFlujo]           nvarchar(100)   NULL,
[ContextoJSON]          nvarchar(MAX)   NULL,
[FechaInicio]           datetime        NOT NULL CONSTRAINT [DF_bot_Conversaciones_FechaInicio] DEFAULT (SYSUTCDATETIME()),
[FechaUltimaActividad]  datetime        NOT NULL CONSTRAINT [DF_bot_Conversaciones_FechaUltimaActividad] DEFAULT (SYSUTCDATETIME()),
[Creado]                nvarchar(100)   NOT NULL,
[Modificado]            nvarchar(100)   NULL,
[UsuarioCreacionID]     int             NOT NULL,
[UsuarioModificacionID] int             NULL,
[FechaCreacion]         datetime        NOT NULL CONSTRAINT [DF_bot_Conversaciones_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
[FechaModificacion]     datetime        NULL,
[bEliminado]            bit             NOT NULL CONSTRAINT [DF_bot_Conversaciones_bEliminado] DEFAULT ((0)),
CONSTRAINT [pk_bot_Conversaciones] PRIMARY KEY CLUSTERED ([ConversacionID] ASC),
CONSTRAINT [FK_bot_Conversaciones_Usuario] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID])
);
END
GO
IF OBJECT_ID(N'bot.CuentasTelegram', N'U') IS NULL
BEGIN
CREATE TABLE [bot].[CuentasTelegram] (
[CuentaTelegramID]      int             IDENTITY(1, 1) NOT NULL,
[UsuarioID]             int             NOT NULL,
[ChatId]                bigint          NOT NULL,
[FechaVinculacion]      datetime        NOT NULL CONSTRAINT [DF_bot_CuentasTelegram_FechaVinculacion] DEFAULT (SYSUTCDATETIME()),
[Activo]                bit             NOT NULL CONSTRAINT [DF_bot_CuentasTelegram_Activo] DEFAULT ((1)),
[Creado]                nvarchar(100)   NOT NULL,
[Modificado]            nvarchar(100)   NULL,
[UsuarioCreacionID]     int             NOT NULL,
[UsuarioModificacionID] int             NULL,
[FechaCreacion]         datetime        NOT NULL CONSTRAINT [DF_bot_CuentasTelegram_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
[FechaModificacion]     datetime        NULL,
[bEliminado]            bit             NOT NULL CONSTRAINT [DF_bot_CuentasTelegram_bEliminado] DEFAULT ((0)),
CONSTRAINT [pk_bot_CuentasTelegram] PRIMARY KEY CLUSTERED ([CuentaTelegramID] ASC),
CONSTRAINT [FK_bot_CuentasTelegram_Usuario] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID])
);
CREATE UNIQUE NONCLUSTERED INDEX [UX_bot_CuentasTelegram_UsuarioID]
    ON [bot].[CuentasTelegram] ([UsuarioID])
    WHERE [bEliminado] = 0;
CREATE UNIQUE NONCLUSTERED INDEX [UX_bot_CuentasTelegram_ChatId]
    ON [bot].[CuentasTelegram] ([ChatId])
    WHERE [bEliminado] = 0;
END
GO
IF OBJECT_ID(N'bot.Sugerencias', N'U') IS NULL
BEGIN
CREATE TABLE [bot].[Sugerencias] (
[SugerenciaID]          int             IDENTITY(1, 1) NOT NULL,
[UsuarioID]             int             NOT NULL,
[Tipo]                  nvarchar(50)    NOT NULL,
[PayloadJSON]           nvarchar(MAX)   NULL,
[Estado]                nvarchar(20)    NOT NULL,
[FechaGenerada]         datetime        NOT NULL CONSTRAINT [DF_bot_Sugerencias_FechaGenerada] DEFAULT (SYSUTCDATETIME()),
[FechaAtendida]         datetime        NULL,
[Creado]                nvarchar(100)   NOT NULL,
[Modificado]            nvarchar(100)   NULL,
[UsuarioCreacionID]     int             NOT NULL,
[UsuarioModificacionID] int             NULL,
[FechaCreacion]         datetime        NOT NULL CONSTRAINT [DF_bot_Sugerencias_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
[FechaModificacion]     datetime        NULL,
[bEliminado]            bit             NOT NULL CONSTRAINT [DF_bot_Sugerencias_bEliminado] DEFAULT ((0)),
CONSTRAINT [pk_bot_Sugerencias] PRIMARY KEY CLUSTERED ([SugerenciaID] ASC),
CONSTRAINT [FK_bot_Sugerencias_Usuario] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID])
);
END
GO
IF OBJECT_ID(N'bot.TokensVinculacion', N'U') IS NULL
BEGIN
CREATE TABLE [bot].[TokensVinculacion] (
[Token]                 nvarchar(64)    NOT NULL,
[UsuarioID]             int             NOT NULL,
[FechaExpira]           datetime        NOT NULL,
[Usado]                 bit             NOT NULL CONSTRAINT [DF_bot_TokensVinculacion_Usado] DEFAULT ((0)),
[Creado]                nvarchar(100)   NOT NULL,
[Modificado]            nvarchar(100)   NULL,
[UsuarioCreacionID]     int             NOT NULL,
[UsuarioModificacionID] int             NULL,
[FechaCreacion]         datetime        NOT NULL CONSTRAINT [DF_bot_TokensVinculacion_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
[FechaModificacion]     datetime        NULL,
[bEliminado]            bit             NOT NULL CONSTRAINT [DF_bot_TokensVinculacion_bEliminado] DEFAULT ((0)),
CONSTRAINT [pk_bot_TokensVinculacion] PRIMARY KEY CLUSTERED ([Token] ASC),
CONSTRAINT [FK_bot_TokensVinculacion_Usuario] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID])
);
END
GO
IF OBJECT_ID(N'fnz.Cuentas', N'U') IS NULL
BEGIN
CREATE TABLE [fnz].[Cuentas] (
[CuentaID] int IDENTITY(1, 1) NOT NULL,
[Cuenta] nvarchar(150) NOT NULL,
[Tipo] nvarchar(50) NOT NULL,
[Saldo] decimal(18, 2) NOT NULL DEFAULT ((0)),
[ResponsableUsuarioID] int NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_fnz_Cuentas_ResponsableUsuarioID] FOREIGN KEY ([ResponsableUsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_fnz_Cuentas] PRIMARY KEY CLUSTERED ([CuentaID] ASC)
);
END
GO
IF OBJECT_ID(N'ia.Consultas', N'U') IS NULL
BEGIN
CREATE TABLE [ia].[Consultas] (
[ConsultaID]            int             IDENTITY(1, 1) NOT NULL,
[UsuarioID]             int             NOT NULL,
[Pregunta]              nvarchar(MAX)   NOT NULL,
[Respuesta]             nvarchar(MAX)   NULL,
[FragmentosUsados]      nvarchar(MAX)   NULL,
[Confianza]             decimal(5, 4)   NULL,
[Escalado]              bit             NOT NULL CONSTRAINT [DF_ia_Consultas_Escalado] DEFAULT ((0)),
[FechaHora]             datetime        NOT NULL CONSTRAINT [DF_ia_Consultas_FechaHora] DEFAULT (SYSUTCDATETIME()),
[Creado]                nvarchar(100)   NOT NULL,
[Modificado]            nvarchar(100)   NULL,
[UsuarioCreacionID]     int             NOT NULL,
[UsuarioModificacionID] int             NULL,
[FechaCreacion]         datetime        NOT NULL CONSTRAINT [DF_ia_Consultas_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
[FechaModificacion]     datetime        NULL,
[bEliminado]            bit             NOT NULL CONSTRAINT [DF_ia_Consultas_bEliminado] DEFAULT ((0)),
CONSTRAINT [pk_ia_Consultas] PRIMARY KEY CLUSTERED ([ConsultaID] ASC),
CONSTRAINT [FK_ia_Consultas_Usuario] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID])
);
END
GO
IF OBJECT_ID(N'ntf.Notificaciones', N'U') IS NULL
BEGIN
CREATE TABLE [ntf].[Notificaciones] (
[NotificacionID] int IDENTITY(1, 1) NOT NULL,
[UsuarioID] int NOT NULL,
[Titulo] nvarchar(200) NOT NULL,
[Mensaje] nvarchar(MAX) NOT NULL,
[Leido] bit NOT NULL DEFAULT ((0)),
[FechaCreacionNotificacion] datetime NOT NULL,
[TipoNotificacionID] int NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_ntf_Notificaciones_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_ntf_Notificaciones] PRIMARY KEY CLUSTERED ([NotificacionID] ASC),
CONSTRAINT [FK_ntf_Notificaciones_TipoNotificacionID] FOREIGN KEY ([TipoNotificacionID]) REFERENCES [ntf].[TiposNotificacion] ([TipoNotificacionID])
);
END
GO
IF OBJECT_ID(N'sgr.Casas', N'U') IS NULL
BEGIN
CREATE TABLE [sgr].[Casas] (
[CasaID] int IDENTITY(1, 1) NOT NULL,
[CondominioID] int NOT NULL,
[DireccionCasa] nvarchar(200) NULL,
[NumeroExtCasa] nvarchar(50) NULL,
[PropietarioUsuarioID] int NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_sgr_Casas_PropietarioUsuarioID] FOREIGN KEY ([PropietarioUsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [FK_sgr_Casas_CondominioID] FOREIGN KEY ([CondominioID]) REFERENCES [sgr].[Condominios] ([CondominioID]),
CONSTRAINT [pk_sgr_Casas] PRIMARY KEY CLUSTERED ([CasaID] ASC)
);
END
GO
IF OBJECT_ID(N'sgr.Menus', N'U') IS NULL
BEGIN
CREATE TABLE [sgr].[Menus] (
[MenuID] int IDENTITY(1, 1) NOT NULL,
[TituloMenu] nvarchar(150) NOT NULL,
[Ruta] nvarchar(250) NULL,
[Icono] nvarchar(100) NULL,
[Orden] int NOT NULL DEFAULT ((0)),
[PadreMenuID] int NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_sgr_Menus_UsuarioCreacionID] FOREIGN KEY ([UsuarioCreacionID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_sgr_Menus] PRIMARY KEY CLUSTERED ([MenuID] ASC),
CONSTRAINT [FK_sgr_Menus_PadreMenuID] FOREIGN KEY ([PadreMenuID]) REFERENCES [sgr].[Menus] ([MenuID])
);
END
GO
IF OBJECT_ID(N'sgr.Perfiles', N'U') IS NULL
BEGIN
CREATE TABLE [sgr].[Perfiles] (
[PerfilID] int IDENTITY(1, 1) NOT NULL,
[Perfil] nvarchar(100) NOT NULL,
[Descripcion] nvarchar(255) NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
[bAdministrador] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_sgr_Perfiles_UsuarioCreacionID] FOREIGN KEY ([UsuarioCreacionID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [UQ_sgr_Perfiles_Perfil] UNIQUE NONCLUSTERED ([Perfil] ASC),
CONSTRAINT [pk_sgr_Perfiles] PRIMARY KEY CLUSTERED ([PerfilID] ASC)
);
END
GO
IF OBJECT_ID(N'sgr.RecuperacionPassword', N'U') IS NULL
BEGIN
CREATE TABLE [sgr].[RecuperacionPassword] (
[RecuperacionPasswordID] int IDENTITY(1, 1) NOT NULL,
[UsuarioID] int NOT NULL,
[Token] nvarchar(500) NOT NULL,
[FechaGeneracion] datetime NOT NULL,
[FechaExpiracion] datetime NOT NULL,
[Usado] bit NOT NULL DEFAULT ((0)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_sgr_RecuperacionPassword_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [FK_sgr_RecuperacionPassword_UsuarioCreacionID] FOREIGN KEY ([UsuarioCreacionID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_sgr_RecuperacionPassword] PRIMARY KEY CLUSTERED ([RecuperacionPasswordID] ASC),
CONSTRAINT [UQ_sgr_RecuperacionPassword_Token] UNIQUE NONCLUSTERED ([Token] ASC)
);
END
GO
IF OBJECT_ID(N'sgr.RefreshTokens', N'U') IS NULL
BEGIN
CREATE TABLE [sgr].[RefreshTokens] (
[TokenID] int IDENTITY(1, 1) NOT NULL,
[UsuarioID] int NOT NULL,
[Token] nvarchar(500) NOT NULL,
[FechaExpira] datetime NOT NULL,
[Revocado] bit NOT NULL DEFAULT ((0)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_sgr_RefreshTokens] PRIMARY KEY CLUSTERED ([TokenID] ASC),
CONSTRAINT [FK_sgr_RefreshTokens_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID])
);
END
GO
IF OBJECT_ID(N'tkt.Tickets', N'U') IS NULL
BEGIN
CREATE TABLE [tkt].[Tickets] (
[TicketID] int IDENTITY(1, 1) NOT NULL,
[TituloTicket] nvarchar(200) NOT NULL,
[DescripcionTicket] nvarchar(MAX) NULL,
[UsuarioSolicitanteID] int NOT NULL,
[PrioridadTicketID] int NOT NULL,
[EstadoTicketID] int NOT NULL,
[CategoriaTicketID] int NULL,
[CanalID] int NULL,
[FechaCreacionTicket] datetime NOT NULL,
[FechaCierre] datetime NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_tkt_Tickets_UsuarioSolicitanteID] FOREIGN KEY ([UsuarioSolicitanteID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [FK_tkt_Tickets_PrioridadTicketID] FOREIGN KEY ([PrioridadTicketID]) REFERENCES [tkt].[PrioridadEstickets] ([PrioridadTicketID]),
CONSTRAINT [pk_tkt_Tickets] PRIMARY KEY CLUSTERED ([TicketID] ASC),
CONSTRAINT [FK_tkt_Tickets_EstadoTicketID] FOREIGN KEY ([EstadoTicketID]) REFERENCES [tkt].[EstadosTickets] ([EstadoTicketID]),
CONSTRAINT [FK_tkt_Tickets_CategoriaTicketID] FOREIGN KEY ([CategoriaTicketID]) REFERENCES [tkt].[CategoriasTicket] ([CategoriaTicketID]),
CONSTRAINT [FK_tkt_Tickets_CanalID] FOREIGN KEY ([CanalID]) REFERENCES [tkt].[CanalesTicket] ([CanalID])
);
END
GO
IF OBJECT_ID(N'usr.Modelos', N'U') IS NULL
BEGIN
CREATE TABLE [usr].[Modelos] (
[ModeloID] int IDENTITY(1, 1) NOT NULL,
[MarcaID] int NOT NULL,
[Modelo] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_usr_Modelos] PRIMARY KEY CLUSTERED ([ModeloID] ASC),
CONSTRAINT [FK_usr_Modelos_MarcaID] FOREIGN KEY ([MarcaID]) REFERENCES [usr].[Marcas] ([MarcaID]),
CONSTRAINT [UQ_usr_Modelos_Marca_Nombre]
UNIQUE NONCLUSTERED ([MarcaID] ASC, [Modelo] ASC));
END
GO
IF OBJECT_ID(N'usr.Parientes', N'U') IS NULL
BEGIN
CREATE TABLE [usr].[Parientes] (
[ParienteID] int IDENTITY(1, 1) NOT NULL,
[UsuarioID] int NOT NULL,
[NombrePariente] nvarchar(100) NOT NULL,
[ParentescoID] int NOT NULL,
[TelefonoPariente] nvarchar(50) NULL,
[CorreoPariente] nvarchar(100) NULL,
[EsContactoEmergencia] bit NOT NULL DEFAULT ((0)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_usr_Parientes_ParentescoID] FOREIGN KEY ([ParentescoID]) REFERENCES [usr].[Parentescos] ([ParentescoID]),
CONSTRAINT [FK_usr_Parientes_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_usr_Parientes] PRIMARY KEY CLUSTERED ([ParienteID] ASC)
);
END
GO
IF OBJECT_ID(N'usr.RazasMascota', N'U') IS NULL
BEGIN
CREATE TABLE [usr].[RazasMascota] (
[RazaMascotaID] int IDENTITY(1, 1) NOT NULL,
[TipoMascotaID] int NOT NULL,
[RazaMascota] nvarchar(100) NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [UQ_usr_RazasMascota_Tipo_Nombre]
UNIQUE NONCLUSTERED ([TipoMascotaID] ASC, [RazaMascota] ASC),
CONSTRAINT [pk_usr_RazasMascota] PRIMARY KEY CLUSTERED ([RazaMascotaID] ASC),
CONSTRAINT [FK_usr_RazasMascota_TipoMascotaID] FOREIGN KEY ([TipoMascotaID]) REFERENCES [usr].[TiposMascota] ([TipoMascotaID])
);
END
GO
IF OBJECT_ID(N'vts.ReservacionesArea', N'U') IS NULL
BEGIN
CREATE TABLE [vts].[ReservacionesArea] (
[ReservacionAreaID] int IDENTITY(1, 1) NOT NULL,
[AreasComunesID] int NOT NULL,
[UsuarioID] int NOT NULL,
[FechaInicio] datetime NOT NULL,
[FechaFin] datetime NOT NULL,
[ReservacionEstadoID] int NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_vts_ReservacionesArea_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [FK_vts_ReservacionesArea_1]
FOREIGN KEY ([AreasComunesID])
REFERENCES [vts].[AreasComunes] ( [AreasComunesID] ),
CONSTRAINT [pk_vts_ReservacionesArea] PRIMARY KEY CLUSTERED ([ReservacionAreaID] ASC),
CONSTRAINT [FK_vts_ReservacionesArea_ReservacionEstadoID] FOREIGN KEY ([ReservacionEstadoID]) REFERENCES [vts].[ReservacionesEstados] ([ReservacionEstadoID])
);
END
GO
IF OBJECT_ID(N'wms.Articulos', N'U') IS NULL
BEGIN
CREATE TABLE [wms].[Articulos] (
[ArticuloID]            int             IDENTITY(1, 1) NOT NULL,
[Nombre]                nvarchar(200)   NOT NULL,
[CategoriaID]           int             NULL,
[Stock]                 int             NOT NULL CONSTRAINT [DF_wms_Articulos_Stock] DEFAULT ((0)),
[StockMinimo]           int             NOT NULL CONSTRAINT [DF_wms_Articulos_StockMinimo] DEFAULT ((0)),
[Ubicacion]             nvarchar(100)   NULL,
[Creado]                nvarchar(100)   NOT NULL,
[Modificado]            nvarchar(100)   NULL,
[UsuarioCreacionID]     int             NOT NULL,
[UsuarioModificacionID] int             NULL,
[FechaCreacion]         datetime        NOT NULL CONSTRAINT [DF_wms_Articulos_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
[FechaModificacion]     datetime        NULL,
[bEliminado]            bit             NOT NULL CONSTRAINT [DF_wms_Articulos_bEliminado] DEFAULT ((0)),
CONSTRAINT [pk_wms_Articulos] PRIMARY KEY CLUSTERED ([ArticuloID] ASC),
CONSTRAINT [FK_wms_Articulos_Categoria] FOREIGN KEY ([CategoriaID]) REFERENCES [wms].[CategoriasArticulo] ([CategoriaID])
);
END
GO
IF OBJECT_ID(N'anm.LogVisualizacionAnuncios', N'U') IS NULL
BEGIN
CREATE TABLE [anm].[LogVisualizacionAnuncios] (
[LogVisualizacionAnuncioID] int IDENTITY(1, 1) NOT NULL,
[AnuncioID] int NOT NULL,
[UsuarioID] int NOT NULL,
[Medio] nvarchar(100) NULL,
[IPOrigen] nvarchar(100) NULL,
[UserAgent] nvarchar(500) NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_anm_LogVisualizacionAnuncios_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_anm_LogVisualizacionAnuncios] PRIMARY KEY CLUSTERED ([LogVisualizacionAnuncioID] ASC),
CONSTRAINT [FK_anm_LogVisualizacionAnuncios_AnuncioID] FOREIGN KEY ([AnuncioID]) REFERENCES [anm].[Anuncios] ([AnuncioID])
);
END
GO
IF OBJECT_ID(N'arc.LogVisualizacionArchivos', N'U') IS NULL
BEGIN
CREATE TABLE [arc].[LogVisualizacionArchivos] (
[LogVisualizacionArchivoID] int IDENTITY(1, 1) NOT NULL,
[ArchivoID] int NOT NULL,
[UsuarioID] int NOT NULL,
[Medio] nvarchar(100) NULL,
[IPOrigen] nvarchar(100) NULL,
[UserAgent] nvarchar(500) NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_arc_LogVisualizacionArchivos_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_arc_LogVisualizacionArchivos] PRIMARY KEY CLUSTERED ([LogVisualizacionArchivoID] ASC),
CONSTRAINT [FK_arc_LogVisualizacionArchivos_ArchivoID] FOREIGN KEY ([ArchivoID]) REFERENCES [arc].[Archivos] ([ArchivoID])
);
END
GO
IF OBJECT_ID(N'enc.OpcionesPregunta', N'U') IS NULL
BEGIN
CREATE TABLE [enc].[OpcionesPregunta] (
[OpcionPreguntaID] int IDENTITY(1, 1) NOT NULL,
[PreguntaID] int NOT NULL,
[Texto] nvarchar(300) NOT NULL,
[Valor] nvarchar(200) NULL,
[Orden] int NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_enc_OpcionesPregunta] PRIMARY KEY CLUSTERED ([OpcionPreguntaID] ASC),
CONSTRAINT [FK_enc_OpcionesPregunta_PreguntaID] FOREIGN KEY ([PreguntaID]) REFERENCES [enc].[Preguntas] ([PreguntaID])
);
END
GO
IF OBJECT_ID(N'jnt.JuntaDetalleArchivos', N'U') IS NULL
BEGIN
CREATE TABLE [jnt].[JuntaDetalleArchivos] (
[JuntaDetalleArchivoID] int IDENTITY(1, 1) NOT NULL,
[JuntaDetalleID] int NOT NULL,
[NombreArchivo] nvarchar(200) NOT NULL,
[Ruta] nvarchar(500) NOT NULL,
[TipoArchivo] nvarchar(100) NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_jnt_JuntaDetalleArchivos] PRIMARY KEY CLUSTERED ([JuntaDetalleArchivoID] ASC),
CONSTRAINT [FK_jnt_JuntaDetalleArchivos_JuntaDetalleID] FOREIGN KEY ([JuntaDetalleID]) REFERENCES [jnt].[JuntaDetalle] ([JuntaDetalleID])
);
END
GO
IF OBJECT_ID(N'bot.Mensajes', N'U') IS NULL
BEGIN
CREATE TABLE [bot].[Mensajes] (
[MensajeID]             int             IDENTITY(1, 1) NOT NULL,
[ConversacionID]        int             NOT NULL,
[Rol]                   nvarchar(20)    NOT NULL,
[Texto]                 nvarchar(MAX)   NULL,
[IntentDetectado]       nvarchar(100)   NULL,
[FechaHora]             datetime        NOT NULL CONSTRAINT [DF_bot_Mensajes_FechaHora] DEFAULT (SYSUTCDATETIME()),
[Creado]                nvarchar(100)   NOT NULL,
[Modificado]            nvarchar(100)   NULL,
[UsuarioCreacionID]     int             NOT NULL,
[UsuarioModificacionID] int             NULL,
[FechaCreacion]         datetime        NOT NULL CONSTRAINT [DF_bot_Mensajes_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
[FechaModificacion]     datetime        NULL,
[bEliminado]            bit             NOT NULL CONSTRAINT [DF_bot_Mensajes_bEliminado] DEFAULT ((0)),
CONSTRAINT [pk_bot_Mensajes] PRIMARY KEY CLUSTERED ([MensajeID] ASC),
CONSTRAINT [FK_bot_Mensajes_Conversacion] FOREIGN KEY ([ConversacionID]) REFERENCES [bot].[Conversaciones] ([ConversacionID])
);
END
GO
IF OBJECT_ID(N'fnz.Transacciones', N'U') IS NULL
BEGIN
CREATE TABLE [fnz].[Transacciones] (
[TransaccionID] int IDENTITY(1, 1) NOT NULL,
[CuentaID] int NOT NULL,
[UsuarioID] int NOT NULL,
[TipoMovimientoID] int NOT NULL,
[Cargo] decimal(18, 2) NULL,
[Abono] decimal(18, 2) NULL,
[Motivo] nvarchar(MAX) NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_fnz_Transacciones_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_fnz_Transacciones] PRIMARY KEY CLUSTERED ([TransaccionID] ASC),
CONSTRAINT [FK_fnz_Transacciones_CuentaID] FOREIGN KEY ([CuentaID]) REFERENCES [fnz].[Cuentas] ([CuentaID]),
CONSTRAINT [FK_fnz_Transacciones_TipoMovimientoID] FOREIGN KEY ([TipoMovimientoID]) REFERENCES [fnz].[TiposMovimiento] ([TipoMovimientoID])
);
END
GO
IF OBJECT_ID(N'ntf.NotificacionesEntrega', N'U') IS NULL
BEGIN
CREATE TABLE [ntf].[NotificacionesEntrega] (
[NotificacionEntregaID] int             IDENTITY(1, 1) NOT NULL,
[NotificacionID]        int             NOT NULL,
[CanalID]               int             NOT NULL,
[Estado]                nvarchar(20)    NOT NULL,
[FechaEnvio]            datetime        NULL,
[Reintentos]            int             NOT NULL CONSTRAINT [DF_ntf_NotificacionesEntrega_Reintentos] DEFAULT ((0)),
[Creado]                nvarchar(100)   NOT NULL,
[Modificado]            nvarchar(100)   NULL,
[UsuarioCreacionID]     int             NOT NULL,
[UsuarioModificacionID] int             NULL,
[FechaCreacion]         datetime        NOT NULL CONSTRAINT [DF_ntf_NotificacionesEntrega_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
[FechaModificacion]     datetime        NULL,
[bEliminado]            bit             NOT NULL CONSTRAINT [DF_ntf_NotificacionesEntrega_bEliminado] DEFAULT ((0)),
CONSTRAINT [pk_ntf_NotificacionesEntrega] PRIMARY KEY CLUSTERED ([NotificacionEntregaID] ASC),
CONSTRAINT [FK_ntf_NotificacionesEntrega_Notificacion] FOREIGN KEY ([NotificacionID]) REFERENCES [ntf].[Notificaciones] ([NotificacionID])
);
END
GO
IF OBJECT_ID(N'ntf.NotificacionesVisualizadas', N'U') IS NULL
BEGIN
CREATE TABLE [ntf].[NotificacionesVisualizadas] (
[NotificacionVisualizadaID] int IDENTITY(1, 1) NOT NULL,
[NotificacionID] int NOT NULL,
[UsuarioID] int NOT NULL,
[FechaLectura] datetime NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_ntf_NotificacionesVisualizadas_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_ntf_NotificacionesVisualizadas] PRIMARY KEY CLUSTERED ([NotificacionVisualizadaID] ASC),
CONSTRAINT [FK_ntf_NotificacionesVisualizadas_NotificacionID] FOREIGN KEY ([NotificacionID]) REFERENCES [ntf].[Notificaciones] ([NotificacionID])
);
END
GO
IF OBJECT_ID(N'fnz.Cuotas', N'U') IS NULL
BEGIN
CREATE TABLE [fnz].[Cuotas] (
[CuotaID] int IDENTITY(1, 1) NOT NULL,
[UsuarioID] int NOT NULL,
[CasaID] int NULL,
[Monto] decimal(18, 2) NOT NULL,
[PeriodoInicio] datetime NOT NULL,
[PeriodoFin] datetime NOT NULL,
[FechaVencimiento] datetime NOT NULL,
[Pagado] bit NOT NULL DEFAULT ((0)),
[FechaPago] datetime NULL,
[MetodoPago] nvarchar(100) NULL,
[ReferenciaPago] nvarchar(200) NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_fnz_Cuotas_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_fnz_Cuotas] PRIMARY KEY CLUSTERED ([CuotaID] ASC),
CONSTRAINT [FK_fnz_Cuotas_CasaID] FOREIGN KEY ([CasaID]) REFERENCES [sgr].[Casas] ([CasaID])
);
END
GO
IF OBJECT_ID(N'sgr.CasaOcupantes', N'U') IS NULL
BEGIN
CREATE TABLE [sgr].[CasaOcupantes] (
[CasaOcupanteID] int IDENTITY(1, 1) NOT NULL,
[CasaID] int NOT NULL,
[UsuarioID] int NOT NULL,
[TipoResidencia] nvarchar(20) NOT NULL,
[FechaInicio] date NULL,
[FechaFin] date NULL,
[Vigente] bit NOT NULL DEFAULT ((1)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_sgr_CasaOcupantes] PRIMARY KEY CLUSTERED ([CasaOcupanteID] ASC),
CONSTRAINT [FK_sgr_CasaOcupantes_CasaID] FOREIGN KEY ([CasaID]) REFERENCES [sgr].[Casas] ([CasaID]),
CONSTRAINT [FK_sgr_CasaOcupantes_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID])
);
END
GO
IF OBJECT_ID(N'vts.Visitas', N'U') IS NULL
BEGIN
CREATE TABLE [vts].[Visitas] (
[VisitaID] int IDENTITY(1, 1) NOT NULL,
[VisitanteNombre] nvarchar(150) NOT NULL,
[UsuarioVisitadoID] int NOT NULL,
[CasaID] int NULL,
[TipoIdentificacionID] int NOT NULL,
[NumeroIdentificacion] nvarchar(200) NOT NULL,
[RutaDocumento] nvarchar(500) NULL,
[FechaEntrada] datetime NOT NULL,
[FechaSalida] datetime NULL,
[Autorizado] bit NOT NULL DEFAULT ((0)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_vts_Visitas_UsuarioVisitadoID] FOREIGN KEY ([UsuarioVisitadoID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_vts_Visitas] PRIMARY KEY CLUSTERED ([VisitaID] ASC),
CONSTRAINT [FK_vts_Visitas_CasaID] FOREIGN KEY ([CasaID]) REFERENCES [sgr].[Casas] ([CasaID]),
CONSTRAINT [FK_vts_Visitas_TipoIdentificacionID] FOREIGN KEY ([TipoIdentificacionID]) REFERENCES [vts].[TipoIdentificacion] ([TipoIdentificacionID])
);
END
GO
IF OBJECT_ID(N'vts.VisitasGeneradas', N'U') IS NULL
BEGIN
CREATE TABLE [vts].[VisitasGeneradas] (
[VisitaGeneradaID] int IDENTITY(1, 1) NOT NULL,
[NombreVisitante] nvarchar(150) NOT NULL,
[UsuarioVisitadoID] int NOT NULL,
[CasaID] int NULL,
[TipoIdentificacionID] int NOT NULL,
[NumeroIdentificacion] nvarchar(200) NOT NULL,
[RutaDocumento] nvarchar(500) NULL,
[CodigoQR] nvarchar(50) NULL,
[FechaEmision] datetime NOT NULL,
[FechaExpira] datetime NULL,
[bUsado] bit NOT NULL DEFAULT ((0)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
[Column_20] int NULL,
[Column_21] int NULL,
CONSTRAINT [FK_vts_VisitasGeneradas_UsuarioVisitadoID] FOREIGN KEY ([UsuarioVisitadoID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_vts_VisitasGeneradas] PRIMARY KEY CLUSTERED ([VisitaGeneradaID] ASC),
CONSTRAINT [UQ_vts_VisitasGeneradas_CodigoQR] UNIQUE NONCLUSTERED ([CodigoQR] ASC),
CONSTRAINT [FK_vts_VisitasGeneradas_CasaID] FOREIGN KEY ([CasaID]) REFERENCES [sgr].[Casas] ([CasaID]),
CONSTRAINT [FK_vts_VisitasGeneradas_TipoIdentificacionID] FOREIGN KEY ([TipoIdentificacionID]) REFERENCES [vts].[TipoIdentificacion] ([TipoIdentificacionID])
);
END
GO
IF OBJECT_ID(N'sgr.MenusBotones', N'U') IS NULL
BEGIN
CREATE TABLE [sgr].[MenusBotones] (
[MenuBotonID] int IDENTITY(1, 1) NOT NULL,
[MenuID] int NOT NULL,
[Boton] nvarchar(150) NOT NULL,
[Accion] nvarchar(200) NULL,
[Icono] nvarchar(100) NULL,
[Orden] int NOT NULL DEFAULT ((0)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_sgr_MenusBotones_UsuarioCreacionID] FOREIGN KEY ([UsuarioCreacionID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_sgr_MenusBotones] PRIMARY KEY CLUSTERED ([MenuBotonID] ASC),
CONSTRAINT [FK_sgr_MenusBotones_MenuID] FOREIGN KEY ([MenuID]) REFERENCES [sgr].[Menus] ([MenuID])
);
END
GO
IF OBJECT_ID(N'sgr.PerfilMenus', N'U') IS NULL
BEGIN
CREATE TABLE [sgr].[PerfilMenus] (
[PerfilMenuID] int IDENTITY(1, 1) NOT NULL,
[PerfilID] int NOT NULL,
[MenuID] int NOT NULL,
[bVisible] bit NOT NULL DEFAULT ((1)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_sgr_PerfilMenus_UsuarioCreacionID] FOREIGN KEY ([UsuarioCreacionID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_sgr_PerfilMenus] PRIMARY KEY CLUSTERED ([PerfilMenuID] ASC),
CONSTRAINT [UQ_Perfil_Menu]
UNIQUE NONCLUSTERED ([PerfilID] ASC, [MenuID] ASC),
CONSTRAINT [FK_sgr_PerfilMenus_MenuID] FOREIGN KEY ([MenuID]) REFERENCES [sgr].[Menus] ([MenuID]),
CONSTRAINT [FK_sgr_PerfilMenus_PerfilID] FOREIGN KEY ([PerfilID]) REFERENCES [sgr].[Perfiles] ([PerfilID])
);
END
GO
IF OBJECT_ID(N'tkt.ComentariosTicket', N'U') IS NULL
BEGIN
CREATE TABLE [tkt].[ComentariosTicket] (
[ComentarioTicketID] int IDENTITY(1, 1) NOT NULL,
[TicketID] int NOT NULL,
[UsuarioID] int NOT NULL,
[Comentario] nvarchar(MAX) NOT NULL,
[FechaComentario] datetime NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
[EsInterno] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_tkt_ComentariosTicket_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_tkt_ComentariosTicket] PRIMARY KEY CLUSTERED ([ComentarioTicketID] ASC),
CONSTRAINT [FK_tkt_ComentariosTicket_TicketID] FOREIGN KEY ([TicketID]) REFERENCES [tkt].[Tickets] ([TicketID])
);
END
GO
IF OBJECT_ID(N'tkt.DocumentosTicket', N'U') IS NULL
BEGIN
CREATE TABLE [tkt].[DocumentosTicket] (
[DocumentoTicketID] int IDENTITY(1, 1) NOT NULL,
[TicketID] int NOT NULL,
[DocumentoID] int NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_tkt_DocumentosTicket] PRIMARY KEY CLUSTERED ([DocumentoTicketID] ASC),
CONSTRAINT [FK_tkt_DocumentosTicket_TicketID] FOREIGN KEY ([TicketID]) REFERENCES [tkt].[Tickets] ([TicketID]),
CONSTRAINT [FK_tkt_DocumentosTicket_DocumentoID] FOREIGN KEY ([DocumentoID]) REFERENCES [arc].[Archivos] ([ArchivoID])
);
END
GO
IF OBJECT_ID(N'tkt.TicketsUsuariosAsignados', N'U') IS NULL
BEGIN
CREATE TABLE [tkt].[TicketsUsuariosAsignados] (
[TicketsUsuariosAsignadosID] int IDENTITY(1, 1) NOT NULL,
[TicketID] int NOT NULL,
[UsuarioID] int NOT NULL,
[Terminado] bit NOT NULL DEFAULT ((0)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_tkt_TicketsUsuariosAsignados_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [FK_tkt_TicketsUsuariosAsignados_UsuarioCreacionID] FOREIGN KEY ([UsuarioCreacionID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_tkt_TicketsUsuariosAsignados] PRIMARY KEY CLUSTERED ([TicketsUsuariosAsignadosID] ASC),
CONSTRAINT [UQ_Usuario_Perfil]
UNIQUE NONCLUSTERED ([UsuarioID] ASC, [TicketID] ASC),
CONSTRAINT [FK_tkt_TicketsUsuariosAsignados_TicketID] FOREIGN KEY ([TicketID]) REFERENCES [tkt].[Tickets] ([TicketID])
);
END
GO
IF OBJECT_ID(N'usr.Automoviles', N'U') IS NULL
BEGIN
CREATE TABLE [usr].[Automoviles] (
[AutomovilID] int IDENTITY(1, 1) NOT NULL,
[UsuarioID] int NOT NULL,
[MarcaID] int NULL,
[ModeloID] int NULL,
[ModeloLibre] nvarchar(200) NULL,
[Placas] nvarchar(50) NULL,
[Color] nvarchar(50) NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_usr_Automoviles_MarcaID] FOREIGN KEY ([MarcaID]) REFERENCES [usr].[Marcas] ([MarcaID]),
CONSTRAINT [FK_usr_Automoviles_ModeloID] FOREIGN KEY ([ModeloID]) REFERENCES [usr].[Modelos] ([ModeloID]),
CONSTRAINT [FK_usr_Automoviles_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_usr_Automoviles] PRIMARY KEY CLUSTERED ([AutomovilID] ASC)
);
END
GO
IF OBJECT_ID(N'usr.Mascotas', N'U') IS NULL
BEGIN
CREATE TABLE [usr].[Mascotas] (
[MascotaID] int IDENTITY(1, 1) NOT NULL,
[UsuarioID] int NOT NULL,
[NombreMascota] nvarchar(100) NOT NULL,
[TipoMascotaID] int NULL,
[RazaMascotaID] int NULL,
[RazaLibre] nvarchar(200) NULL,
[VacunasAlDia] bit NULL,
[FechaUltimaVacuna] date NULL,
[FechaNacimiento] datetime NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_usr_Mascotas_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [FK_usr_Mascotas_RazaMascotaID] FOREIGN KEY ([RazaMascotaID]) REFERENCES [usr].[RazasMascota] ([RazaMascotaID]),
CONSTRAINT [pk_usr_Mascotas] PRIMARY KEY CLUSTERED ([MascotaID] ASC),
CONSTRAINT [FK_usr_Mascotas_TipoMascotaID] FOREIGN KEY ([TipoMascotaID]) REFERENCES [usr].[TiposMascota] ([TipoMascotaID])
);
END
GO
IF OBJECT_ID(N'wms.Prestamos', N'U') IS NULL
BEGIN
CREATE TABLE [wms].[Prestamos] (
[PrestamoID]            int             IDENTITY(1, 1) NOT NULL,
[ArticuloID]            int             NOT NULL,
[UsuarioID]             int             NOT NULL,
[Cantidad]              int             NOT NULL,
[FechaPrestamo]         datetime        NOT NULL CONSTRAINT [DF_wms_Prestamos_FechaPrestamo] DEFAULT (SYSUTCDATETIME()),
[FechaDevolucion]       datetime        NULL,
[Estado]                nvarchar(20)    NOT NULL,
[Creado]                nvarchar(100)   NOT NULL,
[Modificado]            nvarchar(100)   NULL,
[UsuarioCreacionID]     int             NOT NULL,
[UsuarioModificacionID] int             NULL,
[FechaCreacion]         datetime        NOT NULL CONSTRAINT [DF_wms_Prestamos_FechaCreacion] DEFAULT (SYSUTCDATETIME()),
[FechaModificacion]     datetime        NULL,
[bEliminado]            bit             NOT NULL CONSTRAINT [DF_wms_Prestamos_bEliminado] DEFAULT ((0)),
CONSTRAINT [pk_wms_Prestamos] PRIMARY KEY CLUSTERED ([PrestamoID] ASC),
CONSTRAINT [FK_wms_Prestamos_Articulo] FOREIGN KEY ([ArticuloID]) REFERENCES [wms].[Articulos] ([ArticuloID]),
CONSTRAINT [FK_wms_Prestamos_Usuario] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID])
);
END
GO
IF OBJECT_ID(N'enc.Respuestas', N'U') IS NULL
BEGIN
CREATE TABLE [enc].[Respuestas] (
[RespuestaID] int IDENTITY(1, 1) NOT NULL,
[EncuestaID] int NOT NULL,
[PreguntaID] int NOT NULL,
[UsuarioID] int NOT NULL,
[OpcionPreguntaID] int NULL,
[RespuestaTexto] nvarchar(MAX) NULL,
[FechaRespuesta] datetime NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_enc_Respuestas_UsuarioID] FOREIGN KEY ([UsuarioID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_enc_Respuestas] PRIMARY KEY CLUSTERED ([RespuestaID] ASC),
CONSTRAINT [FK_enc_Respuestas_OpcionPreguntaID] FOREIGN KEY ([OpcionPreguntaID]) REFERENCES [enc].[OpcionesPregunta] ([OpcionPreguntaID]),
CONSTRAINT [FK_enc_Respuestas_EncuestaID] FOREIGN KEY ([EncuestaID]) REFERENCES [enc].[Encuestas] ([EncuestaID]),
CONSTRAINT [FK_enc_Respuestas_PreguntaID] FOREIGN KEY ([PreguntaID]) REFERENCES [enc].[Preguntas] ([PreguntaID])
);
END
GO
IF OBJECT_ID(N'fnz.DocumentosTransaccion', N'U') IS NULL
BEGIN
CREATE TABLE [fnz].[DocumentosTransaccion] (
[DocumentoTransaccionID] int IDENTITY(1, 1) NOT NULL,
[TransaccionID] int NOT NULL,
[DocumentoID] int NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_fnz_DocumentosTransaccion] PRIMARY KEY CLUSTERED ([DocumentoTransaccionID] ASC),
CONSTRAINT [FK_fnz_DocumentosTransaccion_TransaccionID] FOREIGN KEY ([TransaccionID]) REFERENCES [fnz].[Transacciones] ([TransaccionID]),
CONSTRAINT [FK_fnz_DocumentosTransaccion_DocumentoID] FOREIGN KEY ([DocumentoID]) REFERENCES [arc].[Archivos] ([ArchivoID])
);
END
GO
IF OBJECT_ID(N'vts.LogUsoVisitas', N'U') IS NULL
BEGIN
CREATE TABLE [vts].[LogUsoVisitas] (
[LogUsoVisitaID] int IDENTITY(1, 1) NOT NULL,
[VisitaGeneradaID] int NOT NULL,
[FechaAcceso] datetime NOT NULL,
[IPOrigen] nvarchar(100) NULL,
[UserAgent] nvarchar(500) NULL,
[Exitoso] bit NOT NULL DEFAULT ((1)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_vts_LogUsoVisitas] PRIMARY KEY CLUSTERED ([LogUsoVisitaID] ASC),
CONSTRAINT [FK_vts_LogUsoVisitas_VisitaGeneradaID] FOREIGN KEY ([VisitaGeneradaID]) REFERENCES [vts].[VisitasGeneradas] ([VisitaGeneradaID])
);
END
GO
IF OBJECT_ID(N'sgr.PerfilMenuBotones', N'U') IS NULL
BEGIN
CREATE TABLE [sgr].[PerfilMenuBotones] (
[PerfilMenuBotonID] int IDENTITY(1, 1) NOT NULL,
[PerfilID] int NOT NULL,
[MenuBotonID] int NOT NULL,
[bActivo] bit NOT NULL DEFAULT ((1)),
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [FK_sgr_PerfilMenuBotones_UsuarioCreacionID] FOREIGN KEY ([UsuarioCreacionID]) REFERENCES [sgr].[Usuarios] ([UsuarioID]),
CONSTRAINT [pk_sgr_PerfilMenuBotones] PRIMARY KEY CLUSTERED ([PerfilMenuBotonID] ASC),
CONSTRAINT [UQ_Perfil_Boton]
UNIQUE NONCLUSTERED ([PerfilID] ASC, [MenuBotonID] ASC),
CONSTRAINT [FK_sgr_PerfilMenuBotones_MenuBotonID] FOREIGN KEY ([MenuBotonID]) REFERENCES [sgr].[MenusBotones] ([MenuBotonID]),
CONSTRAINT [FK_sgr_PerfilMenuBotones_PerfilID] FOREIGN KEY ([PerfilID]) REFERENCES [sgr].[Perfiles] ([PerfilID])
);
END
GO
IF OBJECT_ID(N'tkt.DocumentosComentarioTicket', N'U') IS NULL
BEGIN
CREATE TABLE [tkt].[DocumentosComentarioTicket] (
[DocumentoComentarioTicketID] int IDENTITY(1, 1) NOT NULL,
[ComentarioTicketID] int NOT NULL,
[DocumentoID] int NOT NULL,
[Creado] nvarchar(100) NOT NULL,
[Modificado] nvarchar(100) NULL,
[UsuarioCreacionID] int NOT NULL,
[UsuarioModificacionID] int NULL,
[FechaCreacion] datetime NOT NULL,
[FechaModificacion] datetime NULL,
[bEliminado] bit NOT NULL DEFAULT ((0)),
CONSTRAINT [pk_tkt_DocumentosComentarioTicket] PRIMARY KEY CLUSTERED ([DocumentoComentarioTicketID] ASC),
CONSTRAINT [FK_tkt_DocumentosComentarioTicket_DocumentoID] FOREIGN KEY ([DocumentoID]) REFERENCES [arc].[Archivos] ([ArchivoID]),
CONSTRAINT [FK_tkt_DocumentosComentarioTicket_ComentarioTicketID] FOREIGN KEY ([ComentarioTicketID]) REFERENCES [tkt].[ComentariosTicket] ([ComentarioTicketID])
);
END
GO
CREATE UNIQUE NONCLUSTERED INDEX [UX_sgr_RefreshTokens_Token]
ON [sgr].[RefreshTokens] ([Token])
WHERE [bEliminado] = 0 AND [Revocado] = 0;
GO
CREATE NONCLUSTERED INDEX [IX_ReservacionesArea_ValidacionSolapamiento]
ON [vts].[ReservacionesArea] ([AreasComunesID], [bEliminado], [FechaInicio], [FechaFin])
INCLUDE ([ReservacionAreaID], [ReservacionEstadoID], [UsuarioID]);
GO
CREATE OR ALTER VIEW usr.vsMascotas AS
SELECT M.MascotaID,
       M.UsuarioID,
       U.NombreUsuario,
       U.CorreoUsuario,
       M.NombreMascota,
       M.TipoMascotaID,
       TM.TipoMascota,
       M.RazaMascotaID,
       M.RazaLibre,
       COALESCE(M.RazaLibre, RM.RazaMascota) AS RazaMascota,
       M.FechaNacimiento,
       M.bEliminado
FROM usr.Mascotas M (NOLOCK)
LEFT JOIN sgr.Usuarios U (NOLOCK) ON U.UsuarioID = M.UsuarioID
LEFT JOIN usr.TiposMascota TM (NOLOCK) ON TM.TipoMascotaID = M.TipoMascotaID
LEFT JOIN usr.RazasMascota RM (NOLOCK) ON RM.RazaMascotaID = M.RazaMascotaID;
GO

CREATE OR ALTER VIEW usr.vsAutomoviles AS
SELECT A.AutomovilID,
       A.UsuarioID,
       U.NombreUsuario,
       U.CorreoUsuario,
       A.MarcaID,
       Ma.Marca,
       A.ModeloID,
       A.ModeloLibre,
       COALESCE(A.ModeloLibre, Mo.Modelo) AS Modelo,
       A.Placas,
       A.Color,
       A.bEliminado
FROM usr.Automoviles A (NOLOCK)
LEFT JOIN sgr.Usuarios U (NOLOCK) ON U.UsuarioID = A.UsuarioID
LEFT JOIN usr.Marcas Ma (NOLOCK) ON Ma.MarcaID = A.MarcaID
LEFT JOIN usr.Modelos Mo (NOLOCK) ON Mo.ModeloID = A.ModeloID;
GO


CREATE OR ALTER VIEW sgr.vsCasas AS 
SELECT ca.CasaID
       , ca.CondominioID
       , C.NombreCondominio
       , C.DireccionCondominio
       , ca.DireccionCasa
       , ca.NumeroExtCasa
       , ca.PropietarioUsuarioID
       , U.NombreUsuario AS NombrePropietario
       , U.CorreoUsuario AS CorreoPropietario
       , U.FotoUrlUsuario AS FotoUrlPropietario
       , U.TelefonoUsuario AS TelefonoPropietario
       , ca.bEliminado
FROM sgr.Casas ca (NOLOCK)
INNER JOIN sgr.Condominios C (NOLOCK) ON C.CondominioID = ca.CondominioID
INNER JOIN sgr.Usuarios U (NOLOCK) ON U.UsuarioID = ca.PropietarioUsuarioID
GO

CREATE OR ALTER VIEW sgr.vsUsuarios AS 
SELECT U.UsuarioID,
       U.CorreoUsuario,
       U.PerfilID,
       P.Perfil,
       P.bAdministrador,
       U.PasswordUsuario,
       U.NombreUsuario,
       U.TelefonoUsuario,
       U.FotoUrlUsuario,
       U.bActivoUsuario,
       U.bEliminado,
       U.bActualizarPassword
FROM sgr.Usuarios U (NOLOCK)
INNER JOIN sgr.Perfiles P (NOLOCK) ON P.PerfilID = U.PerfilID
GO


CREATE OR ALTER VIEW sgr.vsPerfiles AS
SELECT P.PerfilID,
       P.Perfil,
       P.Descripcion,
       P.bAdministrador,
       P.bEliminado,
       COUNT(U.UsuarioID) AS UsuariosAsignados
FROM sgr.Perfiles P (NOLOCK)
LEFT JOIN sgr.Usuarios U (NOLOCK) ON U.PerfilID = P.PerfilID AND ISNULL(U.bEliminado,0)=0
GROUP BY P.PerfilID, P.Perfil, P.Descripcion, P.bAdministrador, P.bEliminado
GO

CREATE OR ALTER VIEW sgr.vsPerfilMenus AS
SELECT PM.PerfilMenuID,
       PM.PerfilID,
       Per.Perfil,
       PM.MenuID,
       M.TituloMenu,
       M.Icono,
       M.Ruta,
       M.Orden,
       M.PadreMenuID,
       PM.bVisible,
       PM.bEliminado
FROM sgr.PerfilMenus PM (NOLOCK)
INNER JOIN sgr.Perfiles Per (NOLOCK) ON Per.PerfilID = PM.PerfilID
INNER JOIN sgr.Menus M (NOLOCK) ON M.MenuID = PM.MenuID
GO


CREATE OR ALTER VIEW sgr.vsMenusBotones AS
SELECT MB.MenuBotonID,
       MB.MenuID,
       M.TituloMenu,
       MB.Boton,
       MB.Accion,
       MB.Orden,
       MB.bEliminado
FROM sgr.MenusBotones MB (NOLOCK)
INNER JOIN sgr.Menus M (NOLOCK) ON M.MenuID = MB.MenuID
GO

CREATE OR ALTER VIEW sgr.vsPerfilMenuBotones AS
SELECT PMB.PerfilMenuBotonID,
       PMB.PerfilID,
       P.Perfil,
       PMB.MenuBotonID,
       MB.Boton,
       MB.Accion,
       MB.MenuID,
       M.TituloMenu,
       PMB.bActivo,
       PMB.bEliminado
FROM sgr.PerfilMenuBotones PMB (NOLOCK)
INNER JOIN sgr.Perfiles P (NOLOCK) ON P.PerfilID = PMB.PerfilID
INNER JOIN sgr.MenusBotones MB (NOLOCK) ON MB.MenuBotonID = PMB.MenuBotonID
INNER JOIN sgr.Menus M (NOLOCK) ON M.MenuID = MB.MenuID
GO

CREATE OR ALTER VIEW usr.vsParientes AS
SELECT P.ParienteID,
       P.UsuarioID,
       U.NombreUsuario,
       U.CorreoUsuario,
       P.NombrePariente,
       P.ParentescoID,
       Pa.Parentesco,
       P.TelefonoPariente,
       P.CorreoPariente,
       P.EsContactoEmergencia,
       P.bEliminado
FROM usr.Parientes P (NOLOCK)
INNER JOIN sgr.Usuarios U (NOLOCK) ON U.UsuarioID = P.UsuarioID
INNER JOIN usr.Parentescos Pa (NOLOCK) ON Pa.ParentescoID = P.ParentescoID
GO

CREATE OR ALTER VIEW vts.vsReservacionesArea AS
SELECT R.ReservacionAreaID,
       R.AreasComunesID,
       AC.AreasComunes,
       AC.Capacidad,
       AC.RequiereReservacion,
       R.UsuarioID,
       U.NombreUsuario,
       U.CorreoUsuario,
       R.FechaInicio,
       R.FechaFin,
       R.ReservacionEstadoID,
       E.ReservacionEstado,
       R.bEliminado
FROM vts.ReservacionesArea R (NOLOCK)
INNER JOIN vts.AreasComunes AC (NOLOCK) ON AC.AreasComunesID = R.AreasComunesID
INNER JOIN sgr.Usuarios U (NOLOCK) ON U.UsuarioID = R.UsuarioID
INNER JOIN vts.ReservacionesEstados E (NOLOCK) ON E.ReservacionEstadoID = R.ReservacionEstadoID
GO

CREATE OR ALTER VIEW vts.vsVisitasGeneradas AS
SELECT V.VisitaGeneradaID,
       V.NombreVisitante,
       V.UsuarioVisitadoID,
       U.Nombre AS NombreVisitado,
       U.Correo AS CorreoVisitado,
       V.CasaID,
       C.Direccion AS DireccionCasa,
       C.Numero AS NumeroExtCasa,
       V.TipoIdentificacionID,
       TI.TipoIdentificacion,
       V.NumeroIdentificacion,
       V.RutaDocumento,
       V.CodigoQR,
       V.FechaEmision,
       V.FechaExpira,
       V.bUsado,
       V.bEliminado
FROM vts.VisitasGeneradas V (NOLOCK)
INNER JOIN sgr.Usuarios U (NOLOCK) ON U.UsuarioID = V.UsuarioVisitadoID
INNER JOIN sgr.Casas C (NOLOCK) ON C.CasaID = V.CasaID
INNER JOIN vts.TipoIdentificacion TI (NOLOCK) ON TI.TipoIdentificacionID = V.TipoIdentificacionID
GO

CREATE OR ALTER VIEW anm.vsAnuncios AS
SELECT A.AnuncioID,
       A.Titulo,
       A.Contenido,
       A.FechaPublicacion,
       A.VigenteHasta,
       A.TipoAnuncioID,
       TA.TipoAnuncio,
       A.bEliminado
FROM anm.Anuncios A (NOLOCK)
INNER JOIN anm.TiposAnuncio TA (NOLOCK) ON TA.TipoAnuncioID = A.TipoAnuncioID
GO

CREATE OR ALTER VIEW fnz.vsTransacciones AS
SELECT T.TransaccionID,
       T.CuentaID,
       C.Cuenta,
       C.Tipo AS TipoCuenta,
       T.UsuarioID,
       U.NombreUsuario,
       T.TipoMovimientoID,
       TM.TipoMovimiento,
       T.Cargo,
       T.Abono,
       T.Motivo,
       T.bEliminado
FROM fnz.Transacciones T (NOLOCK)
INNER JOIN fnz.Cuentas C (NOLOCK) ON C.CuentaID = T.CuentaID
INNER JOIN sgr.Usuarios U (NOLOCK) ON U.UsuarioID = T.UsuarioID
INNER JOIN fnz.TiposMovimiento TM (NOLOCK) ON TM.TipoMovimientoID = T.TipoMovimientoID
GO

CREATE OR ALTER VIEW arc.vsArchivos AS
SELECT A.ArchivoID,
       A.Nombre,
       A.Ruta,
       A.TipoArchivoID,
       TA.TipoArchivo,
       A.EsPrivado,
       A.FechaCreacion,
       A.bEliminado
FROM arc.Archivos A (NOLOCK)
INNER JOIN arc.TiposArchivo TA (NOLOCK) ON TA.TipoArchivoID = A.TipoArchivoID
GO

CREATE OR ALTER VIEW tkt.vsTickets AS
SELECT T.TicketID,
       T.TituloTicket,
       T.DescripcionTicket,
       T.UsuarioSolicitanteID,
       USol.NombreUsuario AS NombreSolicitante,
       T.PrioridadTicketID,
       P.PrioridadTicket,
       T.EstadoTicketID,
       E.EstadoTicket,
       T.FechaCreacionTicket,
       T.FechaCierre,
       T.bEliminado
FROM tkt.Tickets T (NOLOCK)
INNER JOIN sgr.Usuarios USol (NOLOCK) ON USol.UsuarioID = T.UsuarioSolicitanteID
INNER JOIN tkt.PrioridadEstickets P (NOLOCK) ON P.PrioridadTicketID = T.PrioridadTicketID
INNER JOIN tkt.EstadosTickets E (NOLOCK) ON E.EstadoTicketID = T.EstadoTicketID
GO

CREATE OR ALTER VIEW tkt.vsTicketsUsuariosAsignados AS
SELECT TUA.TicketsUsuariosAsignadosID,
       TUA.TicketID,
       T.TituloTicket,
       TUA.UsuarioID,
       U.NombreUsuario AS UsuarioAsignado,
       TUA.Terminado,
       TUA.bEliminado
FROM tkt.TicketsUsuariosAsignados TUA (NOLOCK)
INNER JOIN tkt.Tickets T (NOLOCK) ON T.TicketID = TUA.TicketID
INNER JOIN sgr.Usuarios U (NOLOCK) ON U.UsuarioID = TUA.UsuarioID
GO

CREATE OR ALTER VIEW [wms].[vsArticulos]
AS
SELECT
    A.ArticuloID,
    A.Nombre,
    A.CategoriaID,
    C.Nombre AS CategoriaNombre,
    A.Stock,
    A.StockMinimo,
    A.Ubicacion,
    CAST(CASE WHEN A.Stock < A.StockMinimo THEN 1 ELSE 0 END AS BIT) AS BajoMinimo
FROM [wms].[Articulos] AS A WITH (NOLOCK)
LEFT JOIN [wms].[CategoriasArticulo] AS C WITH (NOLOCK)
    ON C.CategoriaID = A.CategoriaID AND C.bEliminado = 0
WHERE A.bEliminado = 0;
GO

CREATE OR ALTER VIEW [wms].[vsPrestamos]
AS
SELECT
    P.PrestamoID,
    P.ArticuloID,
    A.Nombre AS ArticuloNombre,
    P.UsuarioID,
    U.NombreUsuario AS UsuarioNombre,
    P.Cantidad,
    P.FechaPrestamo,
    P.FechaDevolucion,
    P.Estado
FROM [wms].[Prestamos] AS P WITH (NOLOCK)
INNER JOIN [wms].[Articulos] AS A WITH (NOLOCK)
    ON A.ArticuloID = P.ArticuloID AND A.bEliminado = 0
INNER JOIN [sgr].[Usuarios] AS U WITH (NOLOCK)
    ON U.UsuarioID = P.UsuarioID AND U.bEliminado = 0
WHERE P.bEliminado = 0;
GO
