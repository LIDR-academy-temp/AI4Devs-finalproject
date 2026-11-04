using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.NTF;

namespace GraphApi.Repositories.NTF;

public sealed class NotificacionRepository : INotificacionRepository
{
    private readonly IDbConnection _db;
    private readonly string _tipoNotificacionCol;
    private readonly string _usuarioActivoCol;
    private readonly string _perfilNombreCol;

    public NotificacionRepository(IDbConnection db)
    {
        _db = db;
        _tipoNotificacionCol = SqlSchemaCompat.HasColumn(db, "ntf", "TiposNotificacion", "TipoNotificacion")
            ? "TipoNotificacion"
            : "TipoNotiicfacion";
        var (_, _, activo) = SqlSchemaCompat.UsuarioColumns(db, "u");
        _usuarioActivoCol = activo;
        _perfilNombreCol = SqlSchemaCompat.PerfilNombreColumn(db, "p");
    }

    public async Task<(IReadOnlyList<NotificacionItemDto> Items, int TotalNoLeidas)> GetBandejaAsync(
        int usuarioId,
        int pagina,
        int tamano,
        CancellationToken ct = default)
    {
        var sqlItems = $"""
            SELECT n.NotificacionID AS NotificacionId,
                   n.Titulo,
                   n.Mensaje,
                   t.{_tipoNotificacionCol} AS Tipo,
                   n.FechaCreacionNotificacion AS FechaCreacion,
                   CAST(CASE WHEN v.NotificacionVisualizadaID IS NULL THEN 0 ELSE 1 END AS BIT) AS Leida
            FROM ntf.Notificaciones AS n WITH (NOLOCK)
            INNER JOIN ntf.TiposNotificacion AS t WITH (NOLOCK)
                ON t.TipoNotificacionID = n.TipoNotificacionID
            LEFT JOIN ntf.NotificacionesVisualizadas AS v WITH (NOLOCK)
                ON v.NotificacionID = n.NotificacionID
               AND v.UsuarioID = @UsuarioID
               AND v.bEliminado = 0
            WHERE n.UsuarioID = @UsuarioID
              AND n.bEliminado = 0
            ORDER BY n.FechaCreacionNotificacion DESC
            OFFSET @Offset ROWS FETCH NEXT @Tamano ROWS ONLY;
            """;

        const string sqlCount = """
            SELECT COUNT(*)
            FROM ntf.Notificaciones AS n WITH (NOLOCK)
            WHERE n.UsuarioID = @UsuarioID
              AND n.bEliminado = 0
              AND NOT EXISTS (
                  SELECT 1
                  FROM ntf.NotificacionesVisualizadas AS v WITH (NOLOCK)
                  WHERE v.NotificacionID = n.NotificacionID
                    AND v.UsuarioID = @UsuarioID
                    AND v.bEliminado = 0);
            """;

        var offset = (pagina - 1) * tamano;
        var items = (await _db.QueryAsync<NotificacionItemDto>(
            new CommandDefinition(
                sqlItems,
                new { UsuarioID = usuarioId, Offset = offset, Tamano = tamano },
                cancellationToken: ct))).ToList();

        var totalNoLeidas = await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sqlCount, new { UsuarioID = usuarioId }, cancellationToken: ct));

        return (items, totalNoLeidas);
    }

    public async Task<(bool Found, bool Owned)> GetPropiedadAsync(int notificacionId, int usuarioId, CancellationToken ct = default)
    {
        const string sql = """
            SELECT UsuarioID
            FROM ntf.Notificaciones WITH (NOLOCK)
            WHERE NotificacionID = @Id AND bEliminado = 0;
            """;

        var owner = await _db.QuerySingleOrDefaultAsync<int?>(
            new CommandDefinition(sql, new { Id = notificacionId }, cancellationToken: ct));

        if (owner is null)
        {
            return (false, false);
        }

        return (true, owner.Value == usuarioId);
    }

    public async Task MarcarLeidaAsync(int notificacionId, int usuarioId, string correo, CancellationToken ct = default)
    {
        const string sql = """
            INSERT INTO ntf.NotificacionesVisualizadas
                (NotificacionID, UsuarioID, FechaLectura, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            SELECT @NotificacionID, @UsuarioID, SYSUTCDATETIME(), @Correo, @UsuarioID, SYSUTCDATETIME(), 0
            WHERE NOT EXISTS (
                SELECT 1
                FROM ntf.NotificacionesVisualizadas
                WHERE NotificacionID = @NotificacionID
                  AND UsuarioID = @UsuarioID
                  AND bEliminado = 0);
            """;

        await _db.ExecuteAsync(
            new CommandDefinition(
                sql,
                new { NotificacionID = notificacionId, UsuarioID = usuarioId, Correo = correo },
                cancellationToken: ct));
    }

    public Task<int?> ResolveTipoIdAsync(string tipoNotificacion, IDbTransaction? tx = null)
    {
        var sql = $"""
            SELECT TipoNotificacionID
            FROM ntf.TiposNotificacion WITH (NOLOCK)
            WHERE {_tipoNotificacionCol} = @Tipo AND bEliminado = 0;
            """;
        return _db.QuerySingleOrDefaultAsync<int?>(sql, new { Tipo = tipoNotificacion }, tx);
    }

    public Task<int?> ResolveCanalTelegramIdAsync(IDbTransaction? tx = null) =>
        // tkt.CanalesTicket no existe en producción — Telegram no configurado.
        Task.FromResult<int?>(null);

    public async Task<int> NotificarUsuarioAsync(
        IDbTransaction tx,
        int usuarioId,
        int tipoNotificacionId,
        string titulo,
        string mensaje,
        NotificacionAutor autor)
    {
        const string sql = """
            DECLARE @ids TABLE (NotificacionID INT);
            INSERT INTO ntf.Notificaciones
                (UsuarioID, Titulo, Mensaje, Leido, FechaCreacionNotificacion, TipoNotificacionID,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.NotificacionID INTO @ids
            VALUES
                (@UsuarioID, @Titulo, @Mensaje, 0, SYSUTCDATETIME(), @TipoNotificacionID,
                 @Correo, @AutorId, SYSUTCDATETIME(), 0);
            SELECT NotificacionID FROM @ids;
            """;

        var notificacionId = await _db.ExecuteScalarAsync<int>(sql, new
        {
            UsuarioID = usuarioId,
            Titulo = titulo,
            Mensaje = mensaje,
            TipoNotificacionID = tipoNotificacionId,
            Correo = autor.Correo,
            AutorId = autor.UsuarioId,
        }, tx);

        await EnqueueTelegramAsync(tx, notificacionId, usuarioId, autor);
        return 1;
    }

    public async Task<int> NotificarPerfilAsync(
        IDbTransaction tx,
        string perfil,
        bool soloAdministradores,
        int tipoNotificacionId,
        string titulo,
        string mensaje,
        NotificacionAutor autor,
        int? condominioId = null)
    {
        var filtro = soloAdministradores
            ? "p.bAdministrador = 1"
            : $"{_perfilNombreCol} = @Perfil";

        var condoFilter = condominioId is null
            ? string.Empty
            : """
              AND EXISTS (
                    SELECT 1 FROM sgr.CasaOcupantes co WITH (NOLOCK)
                      INNER JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = co.CasaID AND ca.CondominioID = @CondominioId AND ca.bEliminado = 0
                     WHERE co.UsuarioID = u.UsuarioID AND co.Vigente = 1 AND co.bEliminado = 0)
              """;

        var sql = $"""
            DECLARE @nuevas TABLE (NotificacionID INT, UsuarioID INT);
            INSERT INTO ntf.Notificaciones
                (UsuarioID, Titulo, Mensaje, Leido, FechaCreacionNotificacion, TipoNotificacionID,
                 Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.NotificacionID, INSERTED.UsuarioID INTO @nuevas
            SELECT u.UsuarioID, @Titulo, @Mensaje, 0, SYSUTCDATETIME(), @TipoNotificacionID,
                   @Correo, @AutorId, SYSUTCDATETIME(), 0
            FROM sgr.Usuarios AS u WITH (NOLOCK)
            INNER JOIN sgr.Perfiles AS p WITH (NOLOCK) ON p.PerfilID = u.PerfilID
            WHERE u.bEliminado = 0
              AND {_usuarioActivoCol} = 1
              AND p.bEliminado = 0
              AND {filtro}
              {condoFilter};


            SELECT COUNT(*) FROM @nuevas;
            """;

        return await _db.ExecuteScalarAsync<int>(sql, new
        {
            Perfil = perfil,
            Titulo = titulo,
            Mensaje = mensaje,
            TipoNotificacionID = tipoNotificacionId,
            Correo = autor.Correo,
            AutorId = autor.UsuarioId,
            CondominioId = condominioId,
        }, tx);
    }

    private Task EnqueueTelegramAsync(IDbTransaction tx, int notificacionId, int usuarioId, NotificacionAutor autor)
        // tkt.CanalesTicket no existe en producción; notificación Telegram no disponible.
        => Task.CompletedTask;

}
