using System.Data;
using Dapper;
namespace GraphApi.Repositories.FNZ;

public sealed class MorososRepository : IMorososRepository
{
    private readonly IDbConnection _db;
    private readonly string _sql;

    public MorososRepository(IDbConnection db)
    {
        _db = db;
        var nombreCol = ColumnExists("sgr", "vsUsuarios", "Nombre") ? "u.Nombre" : "u.NombreUsuario";
        var casaNumero = ColumnExists("sgr", "Casas", "Numero") ? "ca.Numero" : "ca.NumeroExtCasa";

        _sql = $"""
            SELECT c.UsuarioID AS UsuarioId,
                   {nombreCol} AS Nombre,
                   CAST({casaNumero} AS NVARCHAR(50)) AS Casa,
                   COUNT(*) AS CuotasVencidas,
                   SUM(c.Monto) AS TotalAdeudado
            FROM fnz.Cuotas c WITH (NOLOCK)
            INNER JOIN sgr.vsUsuarios u WITH (NOLOCK) ON u.UsuarioID = c.UsuarioID AND u.bEliminado = 0
            LEFT JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = c.CasaID AND ca.bEliminado = 0
            WHERE c.Pagado = 0
              AND c.bEliminado = 0
              AND c.FechaVencimiento < @Hoy
              AND (@Desde IS NULL OR (c.PeriodoInicio >= @Desde AND c.PeriodoInicio < @Hasta))
            GROUP BY c.UsuarioID, {nombreCol}, c.CasaID, {casaNumero}
            ORDER BY TotalAdeudado DESC;
            """;
    }

    public async Task<IReadOnlyList<MorosoRow>> ListarMorososAsync(
        DateTime hoyLocal,
        DateTime? periodoDesde,
        DateTime? periodoHasta,
        CancellationToken ct = default)
    {
        var rows = await _db.QueryAsync<MorosoRow>(
            new CommandDefinition(
                _sql,
                new { Hoy = hoyLocal, Desde = periodoDesde, Hasta = periodoHasta },
                cancellationToken: ct));

        return rows.ToList();
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
