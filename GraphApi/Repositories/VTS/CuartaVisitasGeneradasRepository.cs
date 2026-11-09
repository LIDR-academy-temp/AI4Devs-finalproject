using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.VTS.CuartaVisitasGeneradas;

namespace GraphApi.Repositories.VTS;

public sealed class CuartaVisitasGeneradasRepository(IDbConnection db) : ICuartaVisitasGeneradasRepository
{
    private static string PaseSelectColumns(IDbConnection connection) =>
        SqlSchemaCompat.HasColumn(connection, "vts", "VisitasGeneradas", "bUnaOcasion")
            ? """
              v.VisitaGeneradaID     AS VisitaGeneradaId,
              v.NombreVisitante,
              v.CodigoQR            AS CodigoQr,
              v.FechaEmision,
              v.FechaExpira,
              v.bUsado              AS BUsado,
              v.bUnaOcasion         AS UnaOcasion,
              v.CasaID              AS CasaId,
              v.DireccionCasa,
              v.UsuarioVisitadoID   AS UsuarioVisitadoId,
              v.NombreVisitado,
              v.TipoIdentificacion,
              v.NumeroIdentificacion
              """
            : """
              v.VisitaGeneradaID     AS VisitaGeneradaId,
              v.NombreVisitante,
              v.CodigoQR            AS CodigoQr,
              v.FechaEmision,
              v.FechaExpira,
              v.bUsado              AS BUsado,
              CAST(1 AS bit)        AS UnaOcasion,
              v.CasaID              AS CasaId,
              v.DireccionCasa,
              v.UsuarioVisitadoID   AS UsuarioVisitadoId,
              v.NombreVisitado,
              v.TipoIdentificacion,
              v.NumeroIdentificacion
              """;

    private string PaseFrom => $"""
        SELECT {PaseSelectColumns(db)}
        FROM vts.vsVisitasGeneradas v WITH (NOLOCK)
        """;

    public async Task<int?> ResolverCasaIdUsuarioAsync(int usuarioId, CancellationToken ct = default)
    {
        int? casaId = null;
        if (SqlSchemaCompat.HasTable(db, "sgr", "CasaOcupantes"))
        {
            const string sql = """
                SELECT TOP (1) o.CasaID
                FROM sgr.CasaOcupantes o WITH (NOLOCK)
                WHERE o.UsuarioID = @usuarioId AND o.Vigente = 1 AND o.bEliminado = 0
                ORDER BY o.CasaOcupanteID;
                """;
            casaId = await db.ExecuteScalarAsync<int?>(new CommandDefinition(sql, new { usuarioId }, cancellationToken: ct));
        }

        if (casaId is > 0)
            return casaId;

        const string propSql = """
            SELECT TOP (1) c.CasaID
            FROM sgr.Casas c WITH (NOLOCK)
            WHERE c.PropietarioUsuarioID = @usuarioId AND c.bEliminado = 0
            ORDER BY c.CasaID;
            """;
        return await db.ExecuteScalarAsync<int?>(new CommandDefinition(propSql, new { usuarioId }, cancellationToken: ct));
    }

    public async Task<bool> CasaActivaExisteAsync(int casaId, CancellationToken ct = default)
    {
        if (casaId <= 0) return false;
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM sgr.Casas c WITH (NOLOCK)
                WHERE c.CasaID = @casaId AND c.bEliminado = 0
            ) THEN 1 ELSE 0 END;
            """;
        return await db.ExecuteScalarAsync<bool>(new CommandDefinition(sql, new { casaId }, cancellationToken: ct));
    }

    public async Task<int?> ResolverTipoIdentificacionIdAsync(int? tipoId, CancellationToken ct = default)
    {
        if (tipoId is > 0)
        {
            const string byId = """
                SELECT TOP (1) TipoIdentificacionID
                FROM vts.TipoIdentificacion WITH (NOLOCK)
                WHERE TipoIdentificacionID = @tipoId AND bEliminado = 0;
                """;
            return await db.ExecuteScalarAsync<int?>(new CommandDefinition(byId, new { tipoId }, cancellationToken: ct));
        }

        const string first = """
            SELECT TOP (1) TipoIdentificacionID
            FROM vts.TipoIdentificacion WITH (NOLOCK)
            WHERE bEliminado = 0
            ORDER BY TipoIdentificacionID;
            """;
        return await db.ExecuteScalarAsync<int?>(new CommandDefinition(first, cancellationToken: ct));
    }

    public async Task<bool> ExisteCodigoQrAsync(string codigoQr, IDbTransaction tx)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM vts.VisitasGeneradas WITH (NOLOCK)
                WHERE CodigoQR = @codigoQr
            ) THEN 1 ELSE 0 END;
            """;
        return await db.ExecuteScalarAsync<bool>(sql, new { codigoQr }, tx);
    }

    public async Task<int> InsertPaseAsync(
        CrearPaseRequest request,
        int usuarioVisitadoId,
        int casaId,
        int tipoIdentificacionId,
        string numeroIdentificacion,
        string codigoQr,
        DateTime fechaEmision,
        DateTime fechaExpira,
        string correo,
        int userId,
        IDbTransaction tx)
    {
        var hasUnaOcasion = SqlSchemaCompat.HasColumn(db, "vts", "VisitasGeneradas", "bUnaOcasion");
        var sql = hasUnaOcasion
            ? """
            INSERT INTO vts.VisitasGeneradas
                (NombreVisitante, UsuarioVisitadoID, CasaID, TipoIdentificacionID, NumeroIdentificacion,
                 RutaDocumento, CodigoQR, FechaEmision, FechaExpira, bUsado, bUnaOcasion, bEliminado,
                 Creado, UsuarioCreacionID, FechaCreacion)
            OUTPUT INSERTED.VisitaGeneradaID
            VALUES
                (@NombreVisitante, @usuarioVisitadoId, @casaId, @tipoIdentificacionId, @numeroIdentificacion,
                 NULL, @codigoQr, @fechaEmision, @fechaExpira, 0, @unaOcasion, 0,
                 @correo, @userId, SYSUTCDATETIME());
            """
            : """
            INSERT INTO vts.VisitasGeneradas
                (NombreVisitante, UsuarioVisitadoID, CasaID, TipoIdentificacionID, NumeroIdentificacion,
                 RutaDocumento, CodigoQR, FechaEmision, FechaExpira, bUsado, bEliminado,
                 Creado, UsuarioCreacionID, FechaCreacion)
            OUTPUT INSERTED.VisitaGeneradaID
            VALUES
                (@NombreVisitante, @usuarioVisitadoId, @casaId, @tipoIdentificacionId, @numeroIdentificacion,
                 NULL, @codigoQr, @fechaEmision, @fechaExpira, 0, 0,
                 @correo, @userId, SYSUTCDATETIME());
            """;
        return await db.ExecuteScalarAsync<int>(sql, new
        {
            request.NombreVisitante,
            usuarioVisitadoId,
            casaId,
            tipoIdentificacionId,
            numeroIdentificacion,
            codigoQr,
            fechaEmision,
            fechaExpira,
            unaOcasion = request.UnaOcasion,
            correo,
            userId,
        }, tx);
    }

    public async Task<PaseVisitaDto?> GetByIdAsync(int visitaGeneradaId, CancellationToken ct = default)
    {
        var sql = PaseFrom + " WHERE v.VisitaGeneradaID = @visitaGeneradaId AND v.bEliminado = 0;";
        return await db.QuerySingleOrDefaultAsync<PaseVisitaDto>(
            new CommandDefinition(sql, new { visitaGeneradaId }, cancellationToken: ct));
    }

    public async Task<IReadOnlyList<PaseVisitaDto>> ListMiasAsync(int usuarioVisitadoId, CancellationToken ct = default)
    {
        var sql = PaseFrom + """
             WHERE v.UsuarioVisitadoID = @usuarioVisitadoId AND v.bEliminado = 0
             ORDER BY v.FechaEmision DESC;
            """;
        var rows = await db.QueryAsync<PaseVisitaDto>(
            new CommandDefinition(sql, new { usuarioVisitadoId }, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<IReadOnlyList<PaseVisitaDto>> ListAdminAsync(
        int? casaId, DateTime? desde, DateTime? hasta, CancellationToken ct = default)
    {
        var sql = PaseFrom + " WHERE v.bEliminado = 0";
        var args = new DynamicParameters();
        if (casaId is > 0)
        {
            sql += " AND v.CasaID = @casaId";
            args.Add("casaId", casaId);
        }

        if (desde.HasValue)
        {
            sql += " AND v.FechaEmision >= @desde";
            args.Add("desde", desde.Value);
        }

        if (hasta.HasValue)
        {
            sql += " AND v.FechaEmision <= @hasta";
            args.Add("hasta", hasta.Value);
        }

        sql += " ORDER BY v.FechaEmision DESC;";
        var rows = await db.QueryAsync<PaseVisitaDto>(
            new CommandDefinition(sql, args, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<PaseVisitaDto?> GetByCodigoAsync(string codigoQr, CancellationToken ct = default)
    {
        var sql = PaseFrom + " WHERE v.CodigoQR = @codigoQr AND v.bEliminado = 0;";
        return await db.QuerySingleOrDefaultAsync<PaseVisitaDto>(
            new CommandDefinition(sql, new { codigoQr }, cancellationToken: ct));
    }

    public async Task<int> MarcarUsadoAsync(int visitaGeneradaId, string correo, int userId, IDbTransaction tx)
    {
        const string sql = """
            UPDATE vts.VisitasGeneradas
            SET bUsado = 1,
                Modificado = @correo,
                UsuarioModificacionID = @userId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE VisitaGeneradaID = @visitaGeneradaId
              AND bEliminado = 0
              AND bUsado = 0;
            """;
        return await db.ExecuteAsync(sql, new { visitaGeneradaId, correo, userId }, tx);
    }

    public async Task InsertLogUsoAsync(int visitaGeneradaId, string correo, int userId, IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO vts.LogUsoVisitas
                (VisitaGeneradaID, FechaAcceso, Exitoso, bEliminado, Creado, UsuarioCreacionID, FechaCreacion)
            VALUES
                (@visitaGeneradaId, SYSUTCDATETIME(), 1, 0, @correo, @userId, SYSUTCDATETIME());
            """;
        await db.ExecuteAsync(sql, new { visitaGeneradaId, correo, userId }, tx);
    }

    public async Task<int> UpdatePaseAsync(
        int visitaGeneradaId,
        CrearPaseRequest request,
        int usuarioVisitadoId,
        int casaId,
        int tipoIdentificacionId,
        string numeroIdentificacion,
        DateTime fechaEmision,
        DateTime fechaExpira,
        string correo,
        int userId)
    {
        var hasUnaOcasion = SqlSchemaCompat.HasColumn(db, "vts", "VisitasGeneradas", "bUnaOcasion");
        var sql = hasUnaOcasion
            ? """
            UPDATE vts.VisitasGeneradas
            SET NombreVisitante = @NombreVisitante,
                UsuarioVisitadoID = @usuarioVisitadoId,
                CasaID = @casaId,
                TipoIdentificacionID = @tipoIdentificacionId,
                NumeroIdentificacion = @numeroIdentificacion,
                FechaEmision = @fechaEmision,
                FechaExpira = @fechaExpira,
                bUnaOcasion = @unaOcasion,
                Modificado = @correo,
                UsuarioModificacionID = @userId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE VisitaGeneradaID = @visitaGeneradaId
              AND bEliminado = 0
              AND (bUsado = 0 OR bUnaOcasion = 0);
            """
            : """
            UPDATE vts.VisitasGeneradas
            SET NombreVisitante = @NombreVisitante,
                UsuarioVisitadoID = @usuarioVisitadoId,
                CasaID = @casaId,
                TipoIdentificacionID = @tipoIdentificacionId,
                NumeroIdentificacion = @numeroIdentificacion,
                FechaEmision = @fechaEmision,
                FechaExpira = @fechaExpira,
                Modificado = @correo,
                UsuarioModificacionID = @userId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE VisitaGeneradaID = @visitaGeneradaId
              AND bEliminado = 0
              AND bUsado = 0;
            """;
        return await db.ExecuteAsync(sql, new
        {
            visitaGeneradaId,
            usuarioVisitadoId,
            request.NombreVisitante,
            casaId,
            tipoIdentificacionId,
            numeroIdentificacion,
            fechaEmision,
            fechaExpira,
            unaOcasion = request.UnaOcasion,
            correo,
            userId,
        });
    }

    public async Task<bool> SoftDeletePaseAsync(int visitaGeneradaId, string correo, int userId)
    {
        const string sql = """
            UPDATE vts.VisitasGeneradas
            SET bEliminado = 1,
                Modificado = @correo,
                UsuarioModificacionID = @userId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE VisitaGeneradaID = @visitaGeneradaId AND bEliminado = 0;
            """;
        return await db.ExecuteAsync(sql, new { visitaGeneradaId, correo, userId }) > 0;
    }
}
