using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.VTS.CuartaVisitasGeneradas;

namespace GraphApi.Repositories.VTS;

public sealed class CuartaVisitasGeneradasRepository(IDbConnection db) : ICuartaVisitasGeneradasRepository
{
    private const string PaseSelect = """
        SELECT v.VisitaGeneradaID     AS VisitaGeneradaId,
               v.NombreVisitante,
               v.CodigoQR            AS CodigoQr,
               v.FechaEmision,
               v.FechaExpira,
               v.bUsado              AS BUsado,
               v.CasaID              AS CasaId,
               v.DireccionCasa,
               v.TipoIdentificacion,
               v.NumeroIdentificacion
        FROM vts.vsVisitasGeneradas v WITH (NOLOCK)
        """;

    public async Task<int?> ResolverCasaIdUsuarioAsync(int usuarioId, CancellationToken ct = default)
    {
        if (SqlSchemaCompat.HasTable(db, "sgr", "CasaOcupantes"))
        {
            const string sql = """
                SELECT TOP (1) o.CasaID
                FROM sgr.CasaOcupantes o WITH (NOLOCK)
                WHERE o.UsuarioID = @usuarioId AND o.Vigente = 1 AND o.bEliminado = 0
                ORDER BY o.CasaOcupanteID;
                """;
            return await db.ExecuteScalarAsync<int?>(new CommandDefinition(sql, new { usuarioId }, cancellationToken: ct));
        }

        const string propSql = """
            SELECT TOP (1) c.CasaID
            FROM sgr.Casas c WITH (NOLOCK)
            WHERE c.PropietarioUsuarioID = @usuarioId AND c.bEliminado = 0;
            """;
        return await db.ExecuteScalarAsync<int?>(new CommandDefinition(propSql, new { usuarioId }, cancellationToken: ct));
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
        const string sql = """
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
            correo,
            userId,
        }, tx);
    }

    public async Task<PaseVisitaDto?> GetByIdAsync(int visitaGeneradaId, CancellationToken ct = default)
    {
        var sql = PaseSelect + " WHERE v.VisitaGeneradaID = @visitaGeneradaId AND v.bEliminado = 0;";
        return await db.QuerySingleOrDefaultAsync<PaseVisitaDto>(
            new CommandDefinition(sql, new { visitaGeneradaId }, cancellationToken: ct));
    }

    public async Task<IReadOnlyList<PaseVisitaDto>> ListMiasAsync(int usuarioVisitadoId, CancellationToken ct = default)
    {
        var sql = PaseSelect + """
             WHERE v.UsuarioVisitadoID = @usuarioVisitadoId AND v.bEliminado = 0
             ORDER BY v.FechaEmision DESC;
            """;
        var rows = await db.QueryAsync<PaseVisitaDto>(
            new CommandDefinition(sql, new { usuarioVisitadoId }, cancellationToken: ct));
        return rows.AsList();
    }

    public async Task<PaseVisitaDto?> GetByCodigoAsync(string codigoQr, CancellationToken ct = default)
    {
        var sql = PaseSelect + " WHERE v.CodigoQR = @codigoQr AND v.bEliminado = 0;";
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
}
