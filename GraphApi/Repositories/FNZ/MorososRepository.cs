using System.Data;
using Dapper;
using GraphApi.Infrastructure;

namespace GraphApi.Repositories.FNZ;

public sealed class MorososRepository : IMorososRepository
{
    private readonly IDbConnection _db;
    private readonly string _sqlListar;
    private readonly string _whereVencidas;

    public MorososRepository(IDbConnection db)
    {
        _db = db;
        TieneColumnaMontoMora = ColumnExists("fnz", "Cuotas", "MontoMora");

        var useView = SqlSchemaCompat.HasView(db, "sgr", "vsUsuarios");
        var userTable = useView ? "sgr.vsUsuarios" : "sgr.Usuarios";
        var nombreCol = useView
            ? (ColumnExists("sgr", "vsUsuarios", "Nombre") ? "u.Nombre" : "u.NombreUsuario")
            : (ColumnExists("sgr", "Usuarios", "Nombre") ? "u.Nombre" : "u.NombreUsuario");
        var casaNumero = ColumnExists("sgr", "Casas", "Numero") ? "ca.Numero" : "ca.NumeroExtCasa";

        var adeudoExpr = TieneColumnaMontoMora
            ? "(c.Monto + c.MontoMora)"
            : "c.Monto";

        _whereVencidas = """
            c.Pagado = 0
              AND c.bEliminado = 0
              AND c.FechaVencimiento < @Hoy
              AND (@Desde IS NULL OR (c.PeriodoInicio >= @Desde AND c.PeriodoInicio < @Hasta))
            """;

        var morasAgg = TieneColumnaMontoMora
            ? """
              SUM(CASE WHEN c.MontoMora > 0 THEN 1 ELSE 0 END) AS MorasAplicadas,
              SUM(c.MontoMora) AS TotalMora,
              """
            : """
              CAST(0 AS INT) AS MorasAplicadas,
              CAST(0 AS DECIMAL(18,2)) AS TotalMora,
              """;

        _sqlListar = $"""
            SELECT c.UsuarioID AS UsuarioId,
                   {nombreCol} AS Nombre,
                   CAST({casaNumero} AS NVARCHAR(50)) AS Casa,
                   c.CasaID AS CasaId,
                   COUNT(*) AS CuotasVencidas,
                   {morasAgg}
                   SUM({adeudoExpr}) AS TotalAdeudado
            FROM fnz.Cuotas c WITH (NOLOCK)
            INNER JOIN {userTable} u WITH (NOLOCK) ON u.UsuarioID = c.UsuarioID AND u.bEliminado = 0
            LEFT JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = c.CasaID AND ca.bEliminado = 0
            WHERE {_whereVencidas}
            GROUP BY c.UsuarioID, {nombreCol}, c.CasaID, {casaNumero}
            ORDER BY TotalAdeudado DESC;
            """;
    }

    public bool TieneColumnaMontoMora { get; }

    public async Task<IReadOnlyList<MorosoRow>> ListarMorososAsync(
        DateTime hoyLocal,
        DateTime? periodoDesde,
        DateTime? periodoHasta,
        CancellationToken ct = default)
    {
        var rows = await _db.QueryAsync<MorosoRow>(
            new CommandDefinition(
                _sqlListar,
                new { Hoy = hoyLocal, Desde = periodoDesde, Hasta = periodoHasta },
                cancellationToken: ct));

        return rows.ToList();
    }

    public async Task<(int Actualizadas, int Omitidas)> AplicarMorasAsync(
        decimal montoMora,
        DateTime hoyLocal,
        DateTime? periodoDesde,
        DateTime? periodoHasta,
        IReadOnlyList<MorosoMorasTargetRow>? residentes,
        string modificadoCorreo,
        int modificadoPorId,
        CancellationToken ct = default)
    {
        var dp = CreateBaseParams(hoyLocal, periodoDesde, periodoHasta, modificadoCorreo, modificadoPorId, montoMora);
        var residentesFilter = AppendResidentesFilter(residentes, dp);

        var countOmitidas = $"""
            SELECT COUNT(*)
            FROM fnz.Cuotas c WITH (NOLOCK)
            WHERE {_whereVencidas}
              AND c.MontoMora > 0
              {residentesFilter};
            """;

        var omitidas = await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(countOmitidas, dp, cancellationToken: ct));

        var sql = $"""
            UPDATE c
               SET MontoMora = @MontoMora,
                   Modificado = @Modificado,
                   UsuarioModificacionID = @ModificadoPorId,
                   FechaModificacion = SYSUTCDATETIME()
              FROM fnz.Cuotas c
             WHERE {_whereVencidas}
               AND c.MontoMora = 0
               {residentesFilter};
            """;

        var actualizadas = await _db.ExecuteAsync(new CommandDefinition(sql, dp, cancellationToken: ct));
        return (actualizadas, omitidas);
    }

    public async Task<int> CondonarMorasAsync(
        DateTime hoyLocal,
        DateTime? periodoDesde,
        DateTime? periodoHasta,
        IReadOnlyList<MorosoMorasTargetRow>? residentes,
        string modificadoCorreo,
        int modificadoPorId,
        CancellationToken ct = default)
    {
        var dp = CreateBaseParams(hoyLocal, periodoDesde, periodoHasta, modificadoCorreo, modificadoPorId, null);
        var residentesFilter = AppendResidentesFilter(residentes, dp);

        var sql = $"""
            UPDATE c
               SET MontoMora = 0,
                   Modificado = @Modificado,
                   UsuarioModificacionID = @ModificadoPorId,
                   FechaModificacion = SYSUTCDATETIME()
              FROM fnz.Cuotas c
             WHERE {_whereVencidas}
               AND c.MontoMora > 0
               {residentesFilter};
            """;

        return await _db.ExecuteAsync(new CommandDefinition(sql, dp, cancellationToken: ct));
    }

    private static DynamicParameters CreateBaseParams(
        DateTime hoyLocal,
        DateTime? periodoDesde,
        DateTime? periodoHasta,
        string modificadoCorreo,
        int modificadoPorId,
        decimal? montoMora)
    {
        var dp = new DynamicParameters();
        dp.Add("Hoy", hoyLocal);
        dp.Add("Desde", periodoDesde);
        dp.Add("Hasta", periodoHasta);
        dp.Add("Modificado", modificadoCorreo);
        dp.Add("ModificadoPorId", modificadoPorId);
        if (montoMora.HasValue)
        {
            dp.Add("MontoMora", montoMora.Value);
        }

        return dp;
    }

    private static string AppendResidentesFilter(IReadOnlyList<MorosoMorasTargetRow>? residentes, DynamicParameters dp)
    {
        if (residentes is null || residentes.Count == 0)
        {
            return string.Empty;
        }

        var ors = new List<string>();
        for (var i = 0; i < residentes.Count; i++)
        {
            ors.Add(
                $"(c.UsuarioID = @ResU{i} AND ((@ResC{i} IS NULL AND c.CasaID IS NULL) OR c.CasaID = @ResC{i}))");
            dp.Add($"ResU{i}", residentes[i].UsuarioId);
            dp.Add($"ResC{i}", residentes[i].CasaId);
        }

        return " AND (" + string.Join(" OR ", ors) + ")";
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
