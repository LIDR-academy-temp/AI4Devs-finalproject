using System.Data;
using Dapper;

namespace GraphApi.Repositories.FNZ;

public sealed class CuotaPagoRepository : ICuotaPagoRepository
{
    private readonly IDbConnection _db;
    private readonly bool _hasCuentaId;
    private readonly bool _hasMontoPagado;
    private readonly bool _hasMontoMora;

    public CuotaPagoRepository(IDbConnection db)
    {
        _db = db;
        _hasCuentaId = ColumnExists("fnz", "Cuotas", "CuentaID");
        _hasMontoPagado = ColumnExists("fnz", "Cuotas", "MontoPagado");
        _hasMontoMora = ColumnExists("fnz", "Cuotas", "MontoMora");
    }

    public bool TieneColumnaCuentaId => _hasCuentaId;

    public async Task<CuotaPagoRow?> ObtenerConBloqueoAsync(int cuotaId, IDbTransaction tx)
    {
        var cuentaSelect = _hasCuentaId ? "c.CuentaID AS CuentaId," : "CAST(NULL AS INT) AS CuentaId,";
        var moraSelect = _hasMontoMora ? "c.MontoMora AS MontoMora," : "CAST(0 AS DECIMAL(18,2)) AS MontoMora,";

        var sql = $"""
            SELECT c.CuotaID AS CuotaId,
                   c.UsuarioID AS UsuarioId,
                   {cuentaSelect}
                   c.Monto AS Monto,
                   {moraSelect}
                   c.Pagado AS Pagado,
                   c.PeriodoInicio AS PeriodoInicio
            FROM fnz.Cuotas c WITH (UPDLOCK, ROWLOCK)
            WHERE c.CuotaID = @CuotaId AND c.bEliminado = 0;
            """;

        return await _db.QuerySingleOrDefaultAsync<CuotaPagoRow>(sql, new { CuotaId = cuotaId }, tx);
    }

    public async Task<int> MarcarPagadaAsync(
        int cuotaId,
        DateTime fechaPago,
        decimal montoPagado,
        string? metodoPago,
        string referenciaPago,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx)
    {
        string sql;
        object args;

        if (_hasMontoPagado)
        {
            sql = """
                UPDATE fnz.Cuotas
                   SET Pagado = 1,
                       FechaPago = @FechaPago,
                       MontoPagado = @MontoPagado,
                       MetodoPago = @MetodoPago,
                       ReferenciaPago = @ReferenciaPago,
                       Modificado = @Modificado,
                       UsuarioModificacionID = @ModificadoPorId,
                       FechaModificacion = SYSUTCDATETIME()
                 WHERE CuotaID = @CuotaId AND Pagado = 0;
                """;
            args = new
            {
                CuotaId = cuotaId,
                FechaPago = fechaPago,
                MontoPagado = montoPagado,
                MetodoPago = metodoPago,
                ReferenciaPago = referenciaPago,
                Modificado = modificadoCorreo,
                ModificadoPorId = modificadoPorId,
            };
        }
        else
        {
            sql = """
                UPDATE fnz.Cuotas
                   SET Pagado = 1,
                       FechaPago = @FechaPago,
                       MetodoPago = @MetodoPago,
                       ReferenciaPago = @ReferenciaPago,
                       Modificado = @Modificado,
                       UsuarioModificacionID = @ModificadoPorId,
                       FechaModificacion = SYSUTCDATETIME()
                 WHERE CuotaID = @CuotaId AND Pagado = 0;
                """;
            args = new
            {
                CuotaId = cuotaId,
                FechaPago = fechaPago,
                MetodoPago = metodoPago,
                ReferenciaPago = referenciaPago,
                Modificado = modificadoCorreo,
                ModificadoPorId = modificadoPorId,
            };
        }

        return await _db.ExecuteAsync(sql, args, tx);
    }

    public async Task<int> InsertarTransaccionPagoAsync(
        int cuentaId,
        int usuarioId,
        decimal montoPagado,
        string motivo,
        string creadoCorreo,
        int creadoPorId,
        IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO fnz.Transacciones
                (CuentaID, UsuarioID, TipoMovimientoID, Cargo, Abono, Motivo,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            SELECT @CuentaId, @UsuarioId, tm.TipoMovimientoID, 0, @MontoPagado, @Motivo,
                   @Creado, @CreadoPorId, SYSUTCDATETIME(), 0
            FROM fnz.TiposMovimiento tm WITH (NOLOCK)
            WHERE tm.TipoMovimiento = N'Pago de cuota' AND tm.bAbono = 1 AND tm.bEliminado = 0;
            """;

        return await _db.ExecuteAsync(sql, new
        {
            CuentaId = cuentaId,
            UsuarioId = usuarioId,
            MontoPagado = montoPagado,
            Motivo = motivo,
            Creado = creadoCorreo,
            CreadoPorId = creadoPorId,
        }, tx);
    }

    public async Task<int?> ObtenerPrimeraCuentaIdAsync(CancellationToken ct = default, IDbTransaction? tx = null)
    {
        const string sql = """
            SELECT TOP (1) CuentaID FROM fnz.Cuentas WITH (NOLOCK)
            WHERE bEliminado = 0 ORDER BY CuentaID;
            """;
        if (tx is null)
        {
            return await _db.QuerySingleOrDefaultAsync<int?>(
                new CommandDefinition(sql, cancellationToken: ct));
        }

        return await _db.QuerySingleOrDefaultAsync<int?>(sql, transaction: tx);
    }

    public async Task<int> AsignarCuentaCuotaAsync(int cuotaId, int cuentaId, IDbTransaction tx)
    {
        if (!_hasCuentaId)
            return 0;

        const string sql = """
            UPDATE fnz.Cuotas SET CuentaID = @CuentaId
            WHERE CuotaID = @CuotaId AND bEliminado = 0 AND CuentaID IS NULL;
            """;
        return await _db.ExecuteAsync(sql, new { CuotaId = cuotaId, CuentaId = cuentaId }, tx);
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
