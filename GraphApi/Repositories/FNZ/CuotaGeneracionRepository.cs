using System.Data;
using Dapper;

namespace GraphApi.Repositories.FNZ;

public sealed class CuotaGeneracionRepository : ICuotaGeneracionRepository
{
    private readonly IDbConnection _db;
    private readonly bool _hasCuentaId;

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
                SELECT c.CasaID AS CasaId, resp.UsuarioID AS UsuarioId
                FROM sgr.Casas c WITH (NOLOCK)
                CROSS APPLY (
                    SELECT TOP (1) co.UsuarioID
                    FROM sgr.CasaOcupantes co WITH (NOLOCK)
                    WHERE co.CasaID = c.CasaID
                      AND co.Vigente = 1
                      AND co.bEliminado = 0
                    ORDER BY CASE WHEN co.TipoResidencia = N'Propietario' THEN 0 ELSE 1 END,
                             co.CasaOcupanteID
                ) resp
                WHERE c.bEliminado = 0;
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
