using System.Data;
using Dapper;

namespace GraphApi.Repositories.FNZ;

public sealed class CuotaEstadoCuentaRepository : ICuotaEstadoCuentaRepository
{
    private readonly IDbConnection _db;
    private readonly string _sql;

    public CuotaEstadoCuentaRepository(IDbConnection db)
    {
        _db = db;
        var hasCuentaId = ColumnExists("fnz", "Cuotas", "CuentaID");
        var hasMontoPagado = ColumnExists("fnz", "Cuotas", "MontoPagado");
        var casaDireccion = ColumnExists("sgr", "Casas", "Direccion") ? "ca.Direccion" : "ca.DireccionCasa";
        var casaNumero = ColumnExists("sgr", "Casas", "Numero") ? "ca.Numero" : "ca.NumeroExtCasa";
        var cuentaNombre = ColumnExists("fnz", "Cuentas", "Nombre") ? "cu.Nombre" : "cu.Cuenta";

        var cuentaJoin = hasCuentaId
            ? $"LEFT JOIN fnz.Cuentas cu WITH (NOLOCK) ON cu.CuentaID = c.CuentaID AND cu.bEliminado = 0"
            : string.Empty;

        var cuentaSelect = hasCuentaId
            ? $"c.CuentaID AS CuentaId, {cuentaNombre} AS Cuenta,"
            : "CAST(NULL AS INT) AS CuentaId, CAST(NULL AS NVARCHAR(150)) AS Cuenta,";

        var montoPagadoSelect = hasMontoPagado
            ? "c.MontoPagado AS MontoPagado,"
            : "CASE WHEN c.Pagado = 1 THEN c.Monto ELSE CAST(0 AS DECIMAL(18,2)) END AS MontoPagado,";

        var hasMontoMora = ColumnExists("fnz", "Cuotas", "MontoMora");
        var montoMoraSelect = hasMontoMora
            ? "c.MontoMora AS MontoMora,"
            : "CAST(0 AS DECIMAL(18,2)) AS MontoMora,";

        _sql = $"""
            SELECT c.CuotaID AS CuotaId,
                   c.CasaID AS CasaId,
                   {casaDireccion} AS Direccion,
                   {casaNumero} AS Numero,
                   {cuentaSelect}
                   c.Monto AS Monto,
                   {montoMoraSelect}
                   {montoPagadoSelect}
                   c.PeriodoInicio AS PeriodoInicio,
                   c.PeriodoFin AS PeriodoFin,
                   c.FechaVencimiento AS FechaVencimiento,
                   c.Pagado AS Pagado,
                   c.FechaPago AS FechaPago,
                   c.MetodoPago AS MetodoPago,
                   c.ReferenciaPago AS ReferenciaPago
            FROM fnz.Cuotas c WITH (NOLOCK)
            LEFT JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = c.CasaID AND ca.bEliminado = 0
            {cuentaJoin}
            WHERE c.UsuarioID = @UsuarioId
              AND c.bEliminado = 0
            ORDER BY c.PeriodoInicio DESC;
            """;
    }

    public async Task<IReadOnlyList<CuotaEstadoCuentaRow>> ListarPorUsuarioAsync(
        int usuarioId,
        CancellationToken ct = default)
    {
        var rows = await _db.QueryAsync<CuotaEstadoCuentaRow>(
            new CommandDefinition(_sql, new { UsuarioId = usuarioId }, cancellationToken: ct));
        return rows.ToList();
    }

    private bool ColumnExists(string schema, string table, string column)
    {
        const string sql = """
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @Schema AND TABLE_NAME = @Table AND COLUMN_NAME = @Column;
            """;

        return _db.QuerySingleOrDefault<int?>(sql, new { Schema = schema, Table = table, Column = column }) == 1;
    }
}
