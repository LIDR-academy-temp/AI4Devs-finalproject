using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.USR.CuartaMascotas;

namespace GraphApi.Repositories.USR;

public class CuartaMascotasRepository(IDbConnection db) : ICuartaMascotasRepository
{
    private MascotaListSql? _list;
    private MascotaListSql List => _list ??= MascotaListSql.Create(db);

    public async Task<IReadOnlyList<MascotaListItemDto>> ListarMisAsync(int usuarioId, CancellationToken ct = default)
    {
        var sql = List.SelectFrom + $"""
            WHERE  M.UsuarioID = @UsuarioId AND M.bEliminado = 0
            ORDER BY {List.MascotaNombreOrder};
            """;
        var result = await db.QueryAsync<MascotaListItemDto>(sql, new { UsuarioId = usuarioId });
        return result.ToList();
    }

    public async Task<IReadOnlyList<MascotaListItemDto>> ListarPadronAsync(CancellationToken ct = default)
    {
        var sql = List.SelectFrom + $"""
            WHERE  M.bEliminado = 0
            ORDER BY {List.NombreUsuarioOrder}, {List.MascotaNombreOrder};
            """;
        var result = await db.QueryAsync<MascotaListItemDto>(sql);
        return result.ToList();
    }

    public async Task<bool> ExisteMascotaAsync(int mascotaId, int usuarioId)
    {
        const string sql = """
            SELECT COUNT(1) FROM usr.Mascotas
            WHERE MascotaID = @MascotaId AND UsuarioID = @UsuarioId AND bEliminado = 0;
            """;
        var count = await db.ExecuteScalarAsync<int>(sql, new { MascotaId = mascotaId, UsuarioId = usuarioId });
        return count > 0;
    }

    public async Task<int> InsertAsync(MascotaCrearRequest req, string correo, int usuarioId, IDbTransaction tx)
    {
        var nombreCol = SqlSchemaCompat.MascotaNombreColumnName(db);
        var vacunasCols = SqlSchemaCompat.MascotasTieneVacunas(db)
            ? "VacunasAlDia, FechaUltimaVacuna, "
            : "";
        var vacunasVals = SqlSchemaCompat.MascotasTieneVacunas(db)
            ? "@VacunasAlDia, @FechaUltimaVacuna, "
            : "";
        var sql = $"""
            INSERT INTO usr.Mascotas
                (UsuarioID, {nombreCol}, TipoMascotaID, RazaMascotaID, RazaLibre,
                 {vacunasCols}FechaNacimiento,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@UsuarioId, @NombreMascota, @TipoMascotaId, @RazaMascotaId, @RazaLibre,
                 {vacunasVals}@FechaNacimiento,
                 @Correo, @UsuarioId, GETDATE(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """;
        return await db.ExecuteScalarAsync<int>(sql, new
        {
            UsuarioId = usuarioId,
            req.NombreMascota,
            TipoMascotaId = req.TipoMascotaId,
            RazaMascotaId = req.RazaMascotaId,
            req.RazaLibre,
            req.VacunasAlDia,
            req.FechaUltimaVacuna,
            req.FechaNacimiento,
            Correo = correo
        }, transaction: tx);
    }

    public async Task<bool> ActualizarAsync(int mascotaId, MascotaActualizarRequest req, string correo, IDbTransaction tx)
    {
        var nombreCol = SqlSchemaCompat.MascotaNombreColumnName(db);
        var vacunasSet = SqlSchemaCompat.MascotasTieneVacunas(db)
            ? """
                VacunasAlDia     = COALESCE(@VacunasAlDia, VacunasAlDia),
                FechaUltimaVacuna = COALESCE(@FechaUltimaVacuna, FechaUltimaVacuna),
              """
            : "";
        var sql = $"""
            UPDATE usr.Mascotas SET
                {nombreCol}    = COALESCE(@NombreMascota, {nombreCol}),
                TipoMascotaID    = COALESCE(@TipoMascotaId, TipoMascotaID),
                RazaMascotaID    = COALESCE(@RazaMascotaId, RazaMascotaID),
                RazaLibre        = COALESCE(@RazaLibre, RazaLibre),
                {vacunasSet}
                FechaNacimiento  = COALESCE(@FechaNacimiento, FechaNacimiento),
                Modificado       = @Correo,
                FechaModificacion = GETDATE()
            WHERE MascotaID = @MascotaId AND bEliminado = 0;
            """;
        var rows = await db.ExecuteAsync(sql, new
        {
            MascotaId = mascotaId,
            req.NombreMascota,
            TipoMascotaId = req.TipoMascotaId,
            RazaMascotaId = req.RazaMascotaId,
            req.RazaLibre,
            req.VacunasAlDia,
            req.FechaUltimaVacuna,
            req.FechaNacimiento,
            Correo = correo
        }, transaction: tx);
        return rows > 0;
    }

    public async Task<bool> SoftDeleteAsync(int mascotaId, string correo, IDbTransaction tx)
    {
        const string sql = """
            UPDATE usr.Mascotas SET
                bEliminado = 1, Modificado = @Correo, FechaModificacion = GETDATE()
            WHERE MascotaID = @MascotaId AND bEliminado = 0;
            """;
        var rows = await db.ExecuteAsync(sql, new { MascotaId = mascotaId, Correo = correo }, transaction: tx);
        return rows > 0;
    }

    public async Task<IReadOnlyList<TipoMascotaDto>> ListarTiposAsync(CancellationToken ct = default)
    {
        const string sql = "SELECT TipoMascotaID AS TipoMascotaId, TipoMascota FROM usr.TiposMascota (NOLOCK) ORDER BY TipoMascota;";
        var result = await db.QueryAsync<TipoMascotaDto>(sql);
        return result.ToList();
    }

    public async Task<IReadOnlyList<RazaMascotaDto>> ListarRazasAsync(CancellationToken ct = default)
    {
        const string sql = "SELECT RazaMascotaID AS RazaMascotaId, RazaMascota, TipoMascotaID AS TipoMascotaId FROM usr.RazasMascota (NOLOCK) ORDER BY RazaMascota;";
        var result = await db.QueryAsync<RazaMascotaDto>(sql);
        return result.ToList();
    }

    private sealed class MascotaListSql
    {
        public required string SelectFrom { get; init; }
        public required string NombreUsuarioOrder { get; init; }
        public required string MascotaNombreOrder { get; init; }

        public static MascotaListSql Create(IDbConnection db)
        {
            SqlSchemaCompat.EnsureOpen(db);
            var (nombre, correo, _) = SqlSchemaCompat.UsuarioColumns(db, "U");
            var mascotaNombre = SqlSchemaCompat.MascotaNombreColumn(db, "M");
            var vacunas = SqlSchemaCompat.MascotaVacunasSelect(db);
            var numeroCasa = SqlSchemaCompat.CasaNumeroSelect(db);
            var casaJoin = SqlSchemaCompat.CasaPorUsuarioJoin(db, "M.UsuarioID");

            var selectFrom = $"""
                SELECT M.MascotaID       AS MascotaId,
                       M.UsuarioID       AS UsuarioId,
                       {nombre}          AS NombreUsuario,
                       {correo}          AS CorreoUsuario,
                       {mascotaNombre}     AS NombreMascota,
                       M.TipoMascotaID   AS TipoMascotaId,
                       TM.TipoMascota,
                       M.RazaMascotaID   AS RazaMascotaId,
                       COALESCE(M.RazaLibre, RM.RazaMascota) AS RazaMascota,
                       M.RazaLibre,
                       {vacunas}
                       M.FechaNacimiento,
                       {numeroCasa}      AS NumeroCasa
                FROM   usr.Mascotas M (NOLOCK)
                JOIN   sgr.Usuarios U   (NOLOCK) ON U.UsuarioID   = M.UsuarioID
                LEFT JOIN usr.TiposMascota TM (NOLOCK) ON TM.TipoMascotaID = M.TipoMascotaID
                LEFT JOIN usr.RazasMascota RM (NOLOCK) ON RM.RazaMascotaID = M.RazaMascotaID
                {casaJoin}
                """;

            return new MascotaListSql
            {
                SelectFrom = selectFrom,
                NombreUsuarioOrder = nombre,
                MascotaNombreOrder = mascotaNombre,
            };
        }
    }
}
