using System.Data;
using Dapper;
using GraphApi.Models.JNT.CuartaJuntas;

namespace GraphApi.Repositories.JNT;

public sealed class CuartaJuntasRepository(IDbConnection db) : ICuartaJuntasRepository
{
    // ── Listar (activas, orden desc) ────────────────────────────────────────
    public async Task<IReadOnlyList<JuntaListItemDto>> ListarAsync(CancellationToken ct = default)
    {
        const string sql = """
            SELECT JuntaID        AS JuntaId,
                   Titulo,
                   Descripcion,
                   FechaProgramada,
                   Ubicacion,
                   bActivo        AS Activa,
                   FechaCreacion
            FROM   jnt.Juntas
            WHERE  bEliminado = 0
            ORDER  BY FechaProgramada DESC
            """;
        var rows = await db.QueryAsync<JuntaListItemDto>(new CommandDefinition(sql, cancellationToken: ct));
        return rows.AsList();
    }

    // ── Detalle ─────────────────────────────────────────────────────────────
    public async Task<JuntaDetalleDto?> ObtenerAsync(int juntaId, CancellationToken ct = default)
    {
        const string sql = """
            SELECT j.JuntaID           AS JuntaId,
                   j.Titulo,
                   j.Descripcion,
                   j.FechaProgramada,
                   j.Ubicacion,
                   j.bActivo           AS Activa,
                   j.FechaCreacion,
                   d.JuntaDetalleID    AS JuntaDetalleId,
                   d.Contenido,
                   d.FechaRegistro     AS FechaRegistroDetalle
            FROM   jnt.Juntas j
            LEFT   JOIN jnt.JuntaDetalle d
                   ON  d.JuntaID = j.JuntaID AND d.bEliminado = 0
            WHERE  j.JuntaID    = @JuntaId
               AND j.bEliminado = 0
            """;

        var junta = await db.QuerySingleOrDefaultAsync<JuntaDetalleDto>(
            new CommandDefinition(sql, new { JuntaId = juntaId }, cancellationToken: ct));

        if (junta is null) return null;

        if (junta.JuntaDetalleId.HasValue)
        {
            const string sqlArch = """
                SELECT JuntaDetalleArchivoID AS JuntaDetalleArchivoId,
                       NombreArchivo,
                       Ruta,
                       TipoArchivo
                FROM   jnt.JuntaDetalleArchivos
                WHERE  JuntaDetalleID = @DetalleId
                  AND  bEliminado     = 0
                """;
            var archivos = await db.QueryAsync<JuntaArchivoDto>(
                new CommandDefinition(sqlArch, new { DetalleId = junta.JuntaDetalleId.Value }, cancellationToken: ct));
            junta.Archivos = archivos.AsList();
        }

        return junta;
    }

    // ── Insert Junta ────────────────────────────────────────────────────────
    public async Task<int> InsertJuntaAsync(
        JuntaCrearRequest request,
        string correo,
        int adminId,
        IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO jnt.Juntas
                (Titulo, Descripcion, FechaProgramada, Ubicacion,
                 bActivo, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@Titulo, @Descripcion, @FechaProgramada, @Ubicacion,
                 1, @Correo, @AdminId, GETDATE(), 0);
            SELECT CAST(SCOPE_IDENTITY() AS int);
            """;
        return await db.ExecuteScalarAsync<int>(sql, new
        {
            request.Titulo,
            request.Descripcion,
            request.FechaProgramada,
            request.Ubicacion,
            Correo = correo,
            AdminId = adminId,
        }, tx);
    }

    // ── Insert Detalle ──────────────────────────────────────────────────────
    public async Task InsertDetalleAsync(
        int juntaId,
        string contenido,
        string correo,
        int adminId,
        IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO jnt.JuntaDetalle
                (JuntaID, Contenido, FechaRegistro,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            VALUES
                (@JuntaId, @Contenido, GETDATE(),
                 @Correo, @AdminId, GETDATE(), 0)
            """;
        await db.ExecuteAsync(sql, new { JuntaId = juntaId, Contenido = contenido, Correo = correo, AdminId = adminId }, tx);
    }

    // ── Actualizar ──────────────────────────────────────────────────────────
    public async Task<bool> ActualizarAsync(
        int juntaId,
        JuntaActualizarRequest request,
        string correo,
        int adminId,
        IDbTransaction tx)
    {
        const string sqlJ = """
            UPDATE jnt.Juntas
            SET    Titulo              = COALESCE(@Titulo, Titulo),
                   Descripcion         = COALESCE(@Descripcion, Descripcion),
                   FechaProgramada     = COALESCE(@FechaProgramada, FechaProgramada),
                   Ubicacion           = COALESCE(@Ubicacion, Ubicacion),
                   bActivo             = COALESCE(@Activa, bActivo),
                   Modificado          = @Correo,
                   UsuarioModificacionID = @AdminId,
                   FechaModificacion   = GETDATE()
            WHERE  JuntaID    = @JuntaId
              AND  bEliminado = 0
            """;
        var rows = await db.ExecuteAsync(sqlJ, new
        {
            JuntaId = juntaId,
            request.Titulo,
            request.Descripcion,
            request.FechaProgramada,
            request.Ubicacion,
            request.Activa,
            Correo = correo,
            AdminId = adminId,
        }, tx);

        if (rows == 0) return false;

        // Update detalle if provided
        if (!string.IsNullOrWhiteSpace(request.Contenido))
        {
            const string sqlD = """
                UPDATE jnt.JuntaDetalle
                SET    Contenido = @Contenido,
                       Modificado = @Correo,
                       UsuarioModificacionID = @AdminId,
                       FechaModificacion = GETDATE()
                WHERE  JuntaID = @JuntaId AND bEliminado = 0
                """;
            var detRows = await db.ExecuteAsync(sqlD, new { JuntaId = juntaId, Contenido = request.Contenido, Correo = correo, AdminId = adminId }, tx);
            if (detRows == 0)
                await InsertDetalleAsync(juntaId, request.Contenido, correo, adminId, tx);
        }

        return true;
    }

    // ── Soft Delete ─────────────────────────────────────────────────────────
    public async Task<bool> SoftDeleteAsync(
        int juntaId,
        string correo,
        int adminId,
        IDbTransaction tx)
    {
        const string sql = """
            UPDATE jnt.Juntas
            SET    bEliminado = 1,
                   Modificado = @Correo,
                   UsuarioModificacionID = @AdminId,
                   FechaModificacion = GETDATE()
            WHERE  JuntaID = @JuntaId AND bEliminado = 0
            """;
        return await db.ExecuteAsync(sql, new { JuntaId = juntaId, Correo = correo, AdminId = adminId }, tx) > 0;
    }
}
