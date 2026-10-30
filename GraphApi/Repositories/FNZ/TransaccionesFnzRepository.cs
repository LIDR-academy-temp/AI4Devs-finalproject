using System.Data;
using Dapper;

namespace GraphApi.Repositories.FNZ;

public sealed class TransaccionesFnzRepository : ITransaccionesFnzRepository
{
    private readonly IDbConnection _db;
    private readonly string _colCuentaNombre;

    public TransaccionesFnzRepository(IDbConnection db)
    {
        _db = db;
        _colCuentaNombre = ColumnExists("fnz", "Cuentas", "Nombre") ? "Nombre" : "Cuenta";
    }

    public async Task<IReadOnlyList<PeriodoCuotasGeneradoRow>> ListarPeriodosGeneradosAsync(CancellationToken ct = default)
    {
        var sql = $"""
            SELECT
                c.PeriodoInicio,
                COUNT(*) AS CuotasGeneradas,
                COUNT(DISTINCT c.CasaID) AS Casas,
                MAX(c.Monto) AS MontoUnitario,
                MIN(c.FechaVencimiento) AS FechaVencimiento,
                MIN(c.FechaCreacion) AS GeneradoEn,
                MAX(cu.{_colCuentaNombre}) AS CuentaNombre
            FROM fnz.Cuotas c WITH (NOLOCK)
            LEFT JOIN fnz.Cuentas cu WITH (NOLOCK)
                ON cu.CuentaID = c.CuentaID AND cu.bEliminado = 0
            WHERE c.bEliminado = 0
            GROUP BY c.PeriodoInicio
            ORDER BY c.PeriodoInicio DESC;
            """;
        var rows = await _db.QueryAsync<PeriodoCuotasGeneradoRow>(new CommandDefinition(sql, cancellationToken: ct));
        return rows.ToList();
    }

    public async Task<IReadOnlyList<MovimientoFnzRow>> ListarMovimientosAdminAsync(int take, CancellationToken ct = default)
    {
        if (take <= 0) take = 50;
        var sql = $"""
            SELECT TOP (@Take)
                t.TransaccionID AS TransaccionId,
                t.CuentaID AS CuentaId,
                cu.{_colCuentaNombre} AS CuentaNombre,
                tm.TipoMovimiento,
                t.Cargo,
                t.Abono,
                t.Motivo,
                t.FechaCreacion
            FROM fnz.Transacciones t WITH (NOLOCK)
            INNER JOIN fnz.TiposMovimiento tm WITH (NOLOCK)
                ON tm.TipoMovimientoID = t.TipoMovimientoID AND tm.bEliminado = 0
            INNER JOIN fnz.Cuentas cu WITH (NOLOCK)
                ON cu.CuentaID = t.CuentaID AND cu.bEliminado = 0
            WHERE t.bEliminado = 0
            ORDER BY t.FechaCreacion DESC, t.TransaccionID DESC;
            """;
        var rows = await _db.QueryAsync<MovimientoFnzRow>(
            new CommandDefinition(sql, new { Take = take }, cancellationToken: ct));
        return rows.ToList();
    }

    public async Task<int> InsertarMovimientoAsync(
        int cuentaId,
        int usuarioId,
        int tipoMovimientoId,
        decimal? cargo,
        decimal? abono,
        string motivo,
        string correo,
        int creadoPorId,
        IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO fnz.Transacciones
                (CuentaID, UsuarioID, TipoMovimientoID, Cargo, Abono, Motivo,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@CuentaId, @UsuarioId, @TipoMovimientoId, @Cargo, @Abono, @Motivo,
                 @Creado, @CreadoPorId, GETDATE(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """;
        return await _db.ExecuteScalarAsync<int>(sql, new
        {
            CuentaId = cuentaId,
            UsuarioId = usuarioId,
            TipoMovimientoId = tipoMovimientoId,
            Cargo = cargo,
            Abono = abono,
            Motivo = motivo,
            Creado = correo,
            CreadoPorId = creadoPorId,
        }, tx);
    }

    public async Task<bool> AjustarSaldoCuentaAsync(int cuentaId, decimal deltaSaldo, IDbTransaction tx)
    {
        const string sql = """
            UPDATE fnz.Cuentas SET Saldo = Saldo + @Delta
            WHERE CuentaID = @CuentaId AND bEliminado = 0;
            """;
        var n = await _db.ExecuteAsync(sql, new { CuentaId = cuentaId, Delta = deltaSaldo }, tx);
        return n > 0;
    }

    private bool ColumnExists(string schema, string table, string column)
    {
        const string sql = """
            SELECT 1 FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @Schema AND TABLE_NAME = @Table AND COLUMN_NAME = @Column;
            """;
        return _db.QuerySingleOrDefault<int?>(sql, new { Schema = schema, Table = table, Column = column }) == 1;
    }
}
