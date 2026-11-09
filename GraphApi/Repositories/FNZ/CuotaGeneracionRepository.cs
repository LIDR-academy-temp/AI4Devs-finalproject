using System.Data;
using Dapper;

namespace GraphApi.Repositories.FNZ;

public sealed class CuotaGeneracionRepository : ICuotaGeneracionRepository
{
    private readonly IDbConnection _db;
    private readonly bool _hasCuentaId;
    private string? _colCuentaNombreResolved;

    private string ColCuentaNombre => _colCuentaNombreResolved ??=
        ColumnExists("fnz", "Cuentas", "Nombre") ? "Nombre" : "Cuenta";

    public CuotaGeneracionRepository(IDbConnection db)
    {
        _db = db;
        _hasCuentaId = ColumnExists("fnz", "Cuotas", "CuentaID");
    }

    public async Task<int> ContarCasasActivasAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT COUNT(*) FROM sgr.Casas WITH (NOLOCK) WHERE bEliminado = 0;
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, cancellationToken: ct));
    }

    public async Task<IReadOnlyList<CasaCuotaElegible>> ListarCasasElegiblesAsync(CancellationToken ct = default)
    {
        if (TableExists("sgr", "CasaOcupantes"))
        {
            const string sqlCo = """
                SELECT c.CasaID AS CasaId, resp.UsuarioId
                FROM sgr.Casas c WITH (NOLOCK)
                CROSS APPLY (
                    SELECT COALESCE(
                        (
                            SELECT TOP (1) co.UsuarioID
                            FROM sgr.CasaOcupantes co WITH (NOLOCK)
                            WHERE co.CasaID = c.CasaID
                              AND co.Vigente = 1
                              AND co.bEliminado = 0
                            ORDER BY CASE WHEN co.TipoResidencia = N'Propietario' THEN 0 ELSE 1 END,
                                     co.CasaOcupanteID
                        ),
                        c.PropietarioUsuarioID
                    ) AS UsuarioId
                ) resp
                WHERE c.bEliminado = 0 AND resp.UsuarioId IS NOT NULL;
                """;
            var list = await _db.QueryAsync<CasaCuotaElegible>(
                new CommandDefinition(sqlCo, cancellationToken: ct));
            return list.ToList();
        }

        const string sqlFallback = """
            SELECT c.CasaID AS CasaId, c.PropietarioUsuarioID AS UsuarioId
            FROM sgr.Casas c WITH (NOLOCK)
            WHERE c.bEliminado = 0 AND c.PropietarioUsuarioID IS NOT NULL;
            """;
        var fallback = await _db.QueryAsync<CasaCuotaElegible>(
            new CommandDefinition(sqlFallback, cancellationToken: ct));
        return fallback.ToList();
    }

    public async Task<bool> ExisteCuotaPeriodoAsync(int casaId, DateTime periodoInicio, IDbTransaction tx)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM fnz.Cuotas WITH (NOLOCK)
                WHERE CasaID = @CasaId AND PeriodoInicio = @PeriodoInicio AND bEliminado = 0
            ) THEN 1 ELSE 0 END;
            """;
        var v = await _db.ExecuteScalarAsync<int>(sql, new { CasaId = casaId, PeriodoInicio = periodoInicio }, tx);
        return v is 1;
    }

    public async Task<bool> CuentaExisteAsync(int cuentaId, CancellationToken ct = default)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM fnz.Cuentas WITH (NOLOCK)
                WHERE CuentaID = @CuentaId AND bEliminado = 0
            ) THEN 1 ELSE 0 END;
            """;
        var v = await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { CuentaId = cuentaId }, cancellationToken: ct));
        return v is 1;
    }

    public async Task<IReadOnlyList<CuentaFnzCatalogoRow>> ListarCuentasActivasAsync(CancellationToken ct = default)
    {
        var sql = $"""
            SELECT CuentaID AS CuentaId, {ColCuentaNombre} AS Nombre
            FROM fnz.Cuentas WITH (NOLOCK)
            WHERE bEliminado = 0
            ORDER BY {ColCuentaNombre};
            """;
        var rows = await _db.QueryAsync<CuentaFnzCatalogoRow>(
            new CommandDefinition(sql, cancellationToken: ct));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<CuentaFnzAdminRow>> ListarCuentasAdminAsync(CancellationToken ct = default)
    {
        var sql = $"""
            SELECT CuentaID AS CuentaId,
                   {ColCuentaNombre} AS Nombre,
                   Tipo,
                   Saldo,
                   ResponsableUsuarioID AS ResponsableUsuarioId
            FROM fnz.Cuentas WITH (NOLOCK)
            WHERE bEliminado = 0
            ORDER BY {ColCuentaNombre};
            """;
        var rows = await _db.QueryAsync<CuentaFnzAdminRow>(
            new CommandDefinition(sql, cancellationToken: ct));
        return rows.ToList();
    }

    public async Task<CuentaFnzAdminRow?> ObtenerCuentaAsync(int cuentaId, CancellationToken ct = default)
    {
        var sql = $"""
            SELECT CuentaID AS CuentaId,
                   {ColCuentaNombre} AS Nombre,
                   Tipo,
                   Saldo,
                   ResponsableUsuarioID AS ResponsableUsuarioId
            FROM fnz.Cuentas WITH (NOLOCK)
            WHERE CuentaID = @CuentaId AND bEliminado = 0;
            """;
        return await _db.QuerySingleOrDefaultAsync<CuentaFnzAdminRow>(
            new CommandDefinition(sql, new { CuentaId = cuentaId }, cancellationToken: ct));
    }

    public async Task<int> InsertarCuentaAsync(
        string nombre, string tipo, decimal saldo, int? responsableUsuarioId, string correo, int userId, CancellationToken ct = default)
    {
        var sql = $"""
            INSERT INTO fnz.Cuentas
                ({ColCuentaNombre}, Tipo, Saldo, ResponsableUsuarioID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@Nombre, @Tipo, @Saldo, @ResponsableUsuarioId, @Correo, @UserId, GETDATE(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(
                sql,
                new { Nombre = nombre, Tipo = tipo, Saldo = saldo, ResponsableUsuarioId = responsableUsuarioId, Correo = correo, UserId = userId },
                cancellationToken: ct));
    }

    public async Task<bool> ActualizarCuentaAsync(
        int cuentaId, string nombre, string tipo, decimal saldo, int? responsableUsuarioId, string correo, int userId, CancellationToken ct = default)
    {
        var sql = $"""
            UPDATE fnz.Cuentas SET
                {ColCuentaNombre} = @Nombre,
                Tipo = @Tipo,
                Saldo = @Saldo,
                ResponsableUsuarioID = @ResponsableUsuarioId,
                Modificado = @Correo,
                UsuarioModificacionID = @UserId,
                FechaModificacion = GETDATE()
            WHERE CuentaID = @CuentaId AND bEliminado = 0;
            """;
        var n = await _db.ExecuteAsync(
            new CommandDefinition(
                sql,
                new
                {
                    CuentaId = cuentaId,
                    Nombre = nombre,
                    Tipo = tipo,
                    Saldo = saldo,
                    ResponsableUsuarioId = responsableUsuarioId,
                    Correo = correo,
                    UserId = userId,
                },
                cancellationToken: ct));
        return n > 0;
    }

    public async Task<bool> SoftDeleteCuentaAsync(int cuentaId, string correo, int userId, CancellationToken ct = default)
    {
        const string sql = """
            UPDATE fnz.Cuentas SET
                bEliminado = 1,
                Modificado = @Correo,
                UsuarioModificacionID = @UserId,
                FechaModificacion = GETDATE()
            WHERE CuentaID = @CuentaId AND bEliminado = 0;
            """;
        var n = await _db.ExecuteAsync(
            new CommandDefinition(sql, new { CuentaId = cuentaId, Correo = correo, UserId = userId }, cancellationToken: ct));
        return n > 0;
    }

    public async Task<int> ContarCuentasPorTipoAsync(string tipo, CancellationToken ct = default)
    {
        const string sql = """
            SELECT COUNT(1)
            FROM fnz.Cuentas WITH (NOLOCK)
            WHERE Tipo = @Tipo AND bEliminado = 0;
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { Tipo = tipo }, cancellationToken: ct));
    }

    public async Task<bool> InsertarCuotaAsync(
        int casaId,
        int usuarioId,
        int? cuentaId,
        decimal monto,
        DateTime periodoInicio,
        DateTime periodoFin,
        DateTime fechaVencimiento,
        string creadoCorreo,
        int creadoPorId,
        IDbTransaction tx)
    {
        string sql;
        object args;

        if (_hasCuentaId)
        {
            sql = """
                INSERT INTO fnz.Cuotas
                    (UsuarioID, CasaID, CuentaID, Monto, PeriodoInicio, PeriodoFin, FechaVencimiento,
                     Pagado, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
                VALUES
                    (@UsuarioId, @CasaId, @CuentaId, @Monto, @PeriodoInicio, @PeriodoFin, @FechaVencimiento,
                     0, @Creado, @CreadoPorId, SYSUTCDATETIME(), 0);
                """;
            args = new
            {
                UsuarioId = usuarioId,
                CasaId = casaId,
                CuentaId = cuentaId,
                Monto = monto,
                PeriodoInicio = periodoInicio,
                PeriodoFin = periodoFin,
                FechaVencimiento = fechaVencimiento,
                Creado = creadoCorreo,
                CreadoPorId = creadoPorId,
            };
        }
        else
        {
            sql = """
                INSERT INTO fnz.Cuotas
                    (UsuarioID, CasaID, Monto, PeriodoInicio, PeriodoFin, FechaVencimiento,
                     Pagado, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
                VALUES
                    (@UsuarioId, @CasaId, @Monto, @PeriodoInicio, @PeriodoFin, @FechaVencimiento,
                     0, @Creado, @CreadoPorId, SYSUTCDATETIME(), 0);
                """;
            args = new
            {
                UsuarioId = usuarioId,
                CasaId = casaId,
                Monto = monto,
                PeriodoInicio = periodoInicio,
                PeriodoFin = periodoFin,
                FechaVencimiento = fechaVencimiento,
                Creado = creadoCorreo,
                CreadoPorId = creadoPorId,
            };
        }

        var rows = await _db.ExecuteAsync(sql, args, tx);
        return rows == 1;
    }

    private bool ColumnExists(string schema, string table, string column)
    {
        const string sql = """
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @Schema AND TABLE_NAME = @Table AND COLUMN_NAME = @Column;
            """;
        return _db.QuerySingleOrDefault<int?>(sql, new { Schema = schema, Table = table, Column = column }) == 1;
    }

    private bool TableExists(string schema, string table)
    {
        const string sql = """
            SELECT CASE WHEN OBJECT_ID(@FullName, 'U') IS NOT NULL THEN 1 ELSE 0 END;
            """;
        var v = _db.ExecuteScalar<int>(sql, new { FullName = $"{schema}.{table}" });
        return v is 1;
    }
}
