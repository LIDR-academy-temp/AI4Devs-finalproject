using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.SGR.Casas;

namespace GraphApi.Repositories.SGR;

public sealed class CasasCuartaRepository : ICasasCuartaRepository
{
    private readonly IDbConnection _db;

    // ADR-008: columnas detectadas una vez en construcción.
    private readonly string _colNombreUsr;   // Nombre | NombreUsuario
    private readonly string _colDireccion;   // Direccion | DireccionCasa
    private readonly string _colNumero;      // Numero | NumeroExtCasa

    public CasasCuartaRepository(IDbConnection db)
    {
        _db = db;
        var (nombre, _, _) = SqlSchemaCompat.UsuarioColumns(db, "u");
        _colNombreUsr  = nombre.Replace("u.", "");
        _colDireccion  = SqlSchemaCompat.HasColumn(db, "sgr", "Casas", "Direccion")
            ? "Direccion" : "DireccionCasa";
        _colNumero     = SqlSchemaCompat.HasColumn(db, "sgr", "Casas", "Numero")
            ? "Numero" : "NumeroExtCasa";
    }

    public async Task<IReadOnlyList<CondominioItemDto>> ListarCondominiosAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT CondominioID AS CondominioId, Nombre, Direccion
            FROM sgr.Condominios WITH (NOLOCK)
            WHERE bEliminado = 0
            ORDER BY Nombre;
            """;
        var list = await _db.QueryAsync<CondominioItemDto>(new CommandDefinition(sql, cancellationToken: ct));
        return list.ToList();
    }

    public async Task<IReadOnlyList<CasaListItemDto>> ListarCasasAsync(
        int? condominioId,
        string? numero,
        bool incluirEliminados,
        CancellationToken ct = default)
    {
        var sql = $"""
            SELECT c.CasaID AS CasaId,
                   c.CondominioID AS CondominioId,
                   cond.Nombre AS CondominioNombre,
                   c.{_colDireccion} AS Direccion,
                   c.{_colNumero} AS Numero,
                   c.PropietarioUsuarioID AS PropietarioUsuarioId,
                   u.{_colNombreUsr} AS PropietarioNombre
            FROM sgr.Casas c WITH (NOLOCK)
            INNER JOIN sgr.Condominios cond WITH (NOLOCK) ON cond.CondominioID = c.CondominioID
            LEFT JOIN sgr.Usuarios u WITH (NOLOCK) ON u.UsuarioID = c.PropietarioUsuarioID AND u.bEliminado = 0
            WHERE 1 = 1
            """;

        if (!incluirEliminados)
        {
            sql += " AND c.bEliminado = 0";
        }

        if (condominioId.HasValue)
        {
            sql += " AND c.CondominioID = @CondominioId";
        }

        if (!string.IsNullOrWhiteSpace(numero))
        {
            sql += $" AND c.{_colNumero} LIKE @Numero";
        }

        sql += $" ORDER BY c.{_colNumero};";

        var list = await _db.QueryAsync<CasaListItemDto>(
            new CommandDefinition(
                sql,
                new { CondominioId = condominioId, Numero = $"%{numero?.Trim()}%" },
                cancellationToken: ct));
        return list.ToList();
    }

    public async Task<CasaListItemDto?> ObtenerCasaAsync(int casaId, CancellationToken ct = default) =>
        await ObtenerCasaPorIdAsync(casaId, null, ct);

    public async Task<CasaListItemDto?> ObtenerCasaPorIdAsync(
        int casaId,
        IDbTransaction? tx,
        CancellationToken ct = default)
    {
        var sql = $"""
            SELECT c.CasaID AS CasaId,
                   c.CondominioID AS CondominioId,
                   cond.Nombre AS CondominioNombre,
                   c.{_colDireccion} AS Direccion,
                   c.{_colNumero} AS Numero,
                   c.PropietarioUsuarioID AS PropietarioUsuarioId,
                   u.{_colNombreUsr} AS PropietarioNombre
            FROM sgr.Casas c WITH (NOLOCK)
            INNER JOIN sgr.Condominios cond WITH (NOLOCK) ON cond.CondominioID = c.CondominioID
            LEFT JOIN sgr.Usuarios u WITH (NOLOCK) ON u.UsuarioID = c.PropietarioUsuarioID AND u.bEliminado = 0
            WHERE c.CasaID = @CasaId;
            """;

        return await _db.QueryFirstOrDefaultAsync<CasaListItemDto>(
            new CommandDefinition(sql, new { CasaId = casaId }, transaction: tx, cancellationToken: ct));
    }

    public async Task<bool> CondominioExisteAsync(int condominioId, IDbTransaction tx)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM sgr.Condominios WITH (NOLOCK)
                WHERE CondominioID = @Id AND bEliminado = 0) THEN 1 ELSE 0 END;
            """;
        return await _db.ExecuteScalarAsync<int>(sql, new { Id = condominioId }, tx) is 1;
    }

    public async Task<bool> UsuarioExisteAsync(int usuarioId, IDbTransaction tx)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM sgr.Usuarios WITH (NOLOCK)
                WHERE UsuarioID = @Id AND bEliminado = 0) THEN 1 ELSE 0 END;
            """;
        return await _db.ExecuteScalarAsync<int>(sql, new { Id = usuarioId }, tx) is 1;
    }

    public async Task<int> InsertCasaAsync(
        int condominioId,
        string direccion,
        string numero,
        int? propietarioUsuarioId,
        string creadoCorreo,
        int creadoPorId,
        IDbTransaction tx)
    {
        var sql = $"""
            INSERT INTO sgr.Casas
                (CondominioID, {_colDireccion}, {_colNumero}, PropietarioUsuarioID,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@CondominioId, @Direccion, @Numero, @PropietarioId,
                 @Creado, @CreadoPorId, SYSUTCDATETIME(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """;

        return await _db.ExecuteScalarAsync<int>(sql, new
        {
            CondominioId = condominioId,
            Direccion = direccion,
            Numero = numero,
            PropietarioId = propietarioUsuarioId,
            Creado = creadoCorreo,
            CreadoPorId = creadoPorId,
        }, tx);
    }

    public async Task<bool> UpdateCasaAsync(
        int casaId,
        string? direccion,
        string? numero,
        int? propietarioUsuarioId,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx)
    {
        var sql = $"""
            UPDATE sgr.Casas
               SET {_colDireccion} = COALESCE(@Direccion, {_colDireccion}),
                   {_colNumero} = COALESCE(@Numero, {_colNumero}),
                   PropietarioUsuarioID = COALESCE(@PropietarioId, PropietarioUsuarioID),
                   Modificado = @Modificado,
                   UsuarioModificacionID = @ModificadoPorId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE CasaID = @CasaId AND bEliminado = 0;
            """;

        var rows = await _db.ExecuteAsync(sql, new
        {
            CasaId = casaId,
            Direccion = direccion,
            Numero = numero,
            PropietarioId = propietarioUsuarioId,
            Modificado = modificadoCorreo,
            ModificadoPorId = modificadoPorId,
        }, tx);

        return rows == 1;
    }

    public async Task<bool> TieneOcupanteVigenteAsync(int casaId, IDbTransaction tx)
    {
        const string checkTable = """
            SELECT CASE WHEN OBJECT_ID(N'sgr.CasaOcupantes', N'U') IS NOT NULL THEN 1 ELSE 0 END;
            """;
        if (await _db.ExecuteScalarAsync<int>(checkTable, transaction: tx) is 1)
        {
            const string sqlCo = """
                SELECT CASE WHEN EXISTS (
                    SELECT 1 FROM sgr.CasaOcupantes WITH (NOLOCK)
                    WHERE CasaID = @CasaId AND Vigente = 1 AND bEliminado = 0) THEN 1 ELSE 0 END;
                """;
            if (await _db.ExecuteScalarAsync<int>(sqlCo, new { CasaId = casaId }, tx) is 1)
            {
                return true;
            }
        }

        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM sgr.Casas WITH (NOLOCK)
                WHERE CasaID = @CasaId AND PropietarioUsuarioID IS NOT NULL AND bEliminado = 0) THEN 1 ELSE 0 END;
            """;
        return await _db.ExecuteScalarAsync<int>(sql, new { CasaId = casaId }, tx) is 1;
    }

    public async Task<bool> TieneCuotasActivasAsync(int casaId, IDbTransaction tx)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM fnz.Cuotas q WITH (NOLOCK)
                WHERE q.CasaID = @CasaId AND q.bEliminado = 0 AND q.Pagado = 0) THEN 1 ELSE 0 END;
            """;
        return await _db.ExecuteScalarAsync<int>(sql, new { CasaId = casaId }, tx) is 1;
    }

    public async Task<bool> SoftDeleteCasaAsync(
        int casaId,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx)
    {
        const string sql = """
            UPDATE sgr.Casas
               SET bEliminado = 1,
                   Modificado = @Modificado,
                   UsuarioModificacionID = @ModificadoPorId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE CasaID = @CasaId AND bEliminado = 0;
            """;

        return await _db.ExecuteAsync(sql, new
        {
            CasaId = casaId,
            Modificado = modificadoCorreo,
            ModificadoPorId = modificadoPorId,
        }, tx) == 1;
    }
}
