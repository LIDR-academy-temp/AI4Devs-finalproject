using System.Data;
using Dapper;
using GraphApi.Infrastructure;
using GraphApi.Models.SGR.Navegacion;

namespace GraphApi.Repositories.SGR;

public sealed class CuartaNavegacionRepository : ICuartaNavegacionRepository
{
    private readonly IDbConnection _db;

    public CuartaNavegacionRepository(IDbConnection db) => _db = db;

    public async Task<int?> ResolverPerfilIdAsync(string perfil, CancellationToken ct = default)
    {
        var perfilCol = SqlSchemaCompat.PerfilNombreColumn(_db).Split('.')[1];
        var sql = $"""
            SELECT PerfilID
            FROM sgr.Perfiles WITH (NOLOCK)
            WHERE [{perfilCol}] = @Perfil AND bEliminado = 0;
            """;
        return await _db.QueryFirstOrDefaultAsync<int?>(
            new CommandDefinition(sql, new { Perfil = perfil }, cancellationToken: ct));
    }

    public async Task<bool> PerfilExisteAsync(int perfilId, CancellationToken ct = default)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM sgr.Perfiles WITH (NOLOCK)
                WHERE PerfilID = @PerfilId AND bEliminado = 0
            ) THEN 1 ELSE 0 END;
            """;
        var v = await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { PerfilId = perfilId }, cancellationToken: ct));
        return v is 1;
    }

    public async Task<IReadOnlyList<PerfilAdminListItemDto>> ListarPerfilesAdminAsync(CancellationToken ct = default)
    {
        var nombreExpr = SqlSchemaCompat.PerfilNombreColumn(_db);
        var sql = $"""
            SELECT
                p.PerfilID AS PerfilId,
                {nombreExpr} AS Nombre,
                p.Descripcion,
                p.bAdministrador AS BAdministrador
            FROM sgr.Perfiles p WITH (NOLOCK)
            WHERE p.bEliminado = 0
            ORDER BY {nombreExpr};
            """;
        var list = await _db.QueryAsync<PerfilAdminListItemDto>(
            new CommandDefinition(sql, cancellationToken: ct));
        return list.ToList();
    }

    public async Task<IReadOnlyList<MenuPerfilRow>> ListarMenusPorPerfilAsync(int perfilId, CancellationToken ct = default)
    {
        const string sql = """
            SELECT
                M.MenuID AS MenuId,
                M.TituloMenu,
                M.Ruta,
                M.Icono,
                M.Orden,
                M.PadreMenuID AS PadreMenuId
            FROM sgr.PerfilMenus PM WITH (NOLOCK)
            INNER JOIN sgr.Menus M WITH (NOLOCK) ON M.MenuID = PM.MenuID
            WHERE PM.PerfilID = @PerfilId
              AND PM.bEliminado = 0
              AND PM.bVisible = 1
              AND M.bEliminado = 0
            ORDER BY M.Orden, M.TituloMenu;
            """;
        var list = await _db.QueryAsync<MenuPerfilRow>(
            new CommandDefinition(sql, new { PerfilId = perfilId }, cancellationToken: ct));
        return list.ToList();
    }

    public async Task<IReadOnlyList<MenuAdminListItemDto>> ListarMenusAdminAsync(
        bool incluirEliminados,
        CancellationToken ct = default)
    {
        var sql = """
            SELECT
                MenuID AS MenuId,
                TituloMenu AS Titulo,
                Ruta,
                Icono,
                Orden,
                PadreMenuID AS PadreMenuId,
                bEliminado AS Eliminado
            FROM sgr.Menus WITH (NOLOCK)
            WHERE 1 = 1
            """;
        if (!incluirEliminados)
        {
            sql += " AND bEliminado = 0";
        }

        sql += " ORDER BY Orden, TituloMenu;";

        var list = await _db.QueryAsync<MenuAdminListItemDto>(
            new CommandDefinition(sql, cancellationToken: ct));
        return list.ToList();
    }

    public async Task<MenuAdminListItemDto?> ObtenerMenuAdminAsync(int menuId, CancellationToken ct = default)
    {
        const string sql = """
            SELECT
                MenuID AS MenuId,
                TituloMenu AS Titulo,
                Ruta,
                Icono,
                Orden,
                PadreMenuID AS PadreMenuId,
                bEliminado AS Eliminado
            FROM sgr.Menus WITH (NOLOCK)
            WHERE MenuID = @MenuId;
            """;
        return await _db.QueryFirstOrDefaultAsync<MenuAdminListItemDto>(
            new CommandDefinition(sql, new { MenuId = menuId }, cancellationToken: ct));
    }

    public async Task<bool> MenuExisteAsync(int menuId, IDbTransaction tx)
    {
        const string sql = """
            SELECT CASE WHEN EXISTS (
                SELECT 1 FROM sgr.Menus
                WHERE MenuID = @MenuId AND bEliminado = 0
            ) THEN 1 ELSE 0 END;
            """;
        var v = await _db.ExecuteScalarAsync<int>(sql, new { MenuId = menuId }, tx);
        return v is 1;
    }

    public async Task<int> InsertMenuAsync(
        MenuCrearRequest request,
        string creadoCorreo,
        int usuarioId,
        IDbTransaction tx)
    {
        const string sql = """
            INSERT INTO sgr.Menus (
                TituloMenu, Ruta, Icono, Orden, PadreMenuID,
                Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.MenuID
            VALUES (
                @Titulo, @Ruta, @Icono, @Orden, @PadreMenuId,
                @Creado, @UsuarioId, SYSUTCDATETIME(), 0);
            """;
        return await _db.ExecuteScalarAsync<int>(sql, new
        {
            Titulo = request.Titulo.Trim(),
            Ruta = request.Ruta?.Trim(),
            Icono = request.Icono?.Trim(),
            request.Orden,
            PadreMenuId = request.PadreMenuId,
            Creado = creadoCorreo,
            UsuarioId = usuarioId
        }, tx);
    }

    public async Task<bool> ActualizarMenuAsync(
        int menuId,
        MenuActualizarRequest request,
        string modificadoCorreo,
        int usuarioId,
        IDbTransaction tx)
    {
        const string sql = """
            UPDATE sgr.Menus
               SET TituloMenu = COALESCE(@Titulo, TituloMenu),
                   Ruta = COALESCE(@Ruta, Ruta),
                   Icono = COALESCE(@Icono, Icono),
                   Orden = COALESCE(@Orden, Orden),
                   PadreMenuID = COALESCE(@PadreMenuId, PadreMenuID),
                   Modificado = @Modificado,
                   UsuarioModificacionID = @UsuarioId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE MenuID = @MenuId AND bEliminado = 0;
            """;
        var rows = await _db.ExecuteAsync(sql, new
        {
            MenuId = menuId,
            Titulo = request.Titulo?.Trim(),
            Ruta = request.Ruta?.Trim(),
            Icono = request.Icono?.Trim(),
            request.Orden,
            PadreMenuId = request.PadreMenuId,
            Modificado = modificadoCorreo,
            UsuarioId = usuarioId
        }, tx);
        return rows > 0;
    }

    public async Task<bool> SoftDeleteMenuAsync(
        int menuId,
        string modificadoCorreo,
        int usuarioId,
        IDbTransaction tx)
    {
        const string sql = """
            UPDATE sgr.Menus
               SET bEliminado = 1,
                   Modificado = @Modificado,
                   UsuarioModificacionID = @UsuarioId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE MenuID = @MenuId AND bEliminado = 0;
            """;
        var rows = await _db.ExecuteAsync(sql, new
        {
            MenuId = menuId,
            Modificado = modificadoCorreo,
            UsuarioId = usuarioId
        }, tx);
        return rows > 0;
    }

    public async Task<IReadOnlyList<PerfilMenuPermisoDto>> ListarPermisosMenusPerfilAsync(
        int perfilId,
        CancellationToken ct = default)
    {
        const string sql = """
            SELECT
                M.MenuID AS MenuId,
                M.TituloMenu AS Titulo,
                CAST(CASE WHEN PM.PerfilMenuID IS NOT NULL AND PM.bVisible = 1 THEN 1 ELSE 0 END AS bit) AS Visible,
                CAST(CASE WHEN PM.PerfilMenuID IS NOT NULL AND PM.bEliminado = 0 THEN 1 ELSE 0 END AS bit) AS Asignado
            FROM sgr.Menus M WITH (NOLOCK)
            LEFT JOIN sgr.PerfilMenus PM WITH (NOLOCK)
                ON PM.MenuID = M.MenuID AND PM.PerfilID = @PerfilId AND PM.bEliminado = 0
            WHERE M.bEliminado = 0
            ORDER BY M.Orden, M.TituloMenu;
            """;
        var list = await _db.QueryAsync<PerfilMenuPermisoDto>(
            new CommandDefinition(sql, new { PerfilId = perfilId }, cancellationToken: ct));
        return list.ToList();
    }

    public async Task<int> ContarMenusExistentesAsync(IReadOnlyCollection<int> menuIds, IDbTransaction tx)
    {
        if (menuIds.Count == 0)
        {
            return 0;
        }

        const string sql = """
            SELECT COUNT(DISTINCT MenuID)
            FROM sgr.Menus
            WHERE bEliminado = 0 AND MenuID IN @MenuIds;
            """;
        return await _db.ExecuteScalarAsync<int>(sql, new { MenuIds = menuIds }, tx);
    }

    public async Task SincronizarPerfilMenusAsync(
        int perfilId,
        IReadOnlyList<PerfilMenuAsignacionItemRequest> menus,
        string correo,
        int usuarioId,
        IDbTransaction tx)
    {
        const string softDeleteOtros = """
            UPDATE sgr.PerfilMenus
               SET bEliminado = 1,
                   Modificado = @Correo,
                   UsuarioModificacionID = @UsuarioId,
                   FechaModificacion = SYSUTCDATETIME()
             WHERE PerfilID = @PerfilId
               AND bEliminado = 0
               AND MenuID NOT IN @MenuIds;
            """;

        var menuIds = menus.Select(m => m.MenuId).Distinct().ToArray();
        if (menuIds.Length > 0)
        {
            await _db.ExecuteAsync(softDeleteOtros, new
            {
                PerfilId = perfilId,
                MenuIds = menuIds,
                Correo = correo,
                UsuarioId = usuarioId
            }, tx);
        }
        else
        {
            const string softDeleteAll = """
                UPDATE sgr.PerfilMenus
                   SET bEliminado = 1,
                       Modificado = @Correo,
                       UsuarioModificacionID = @UsuarioId,
                       FechaModificacion = SYSUTCDATETIME()
                 WHERE PerfilID = @PerfilId AND bEliminado = 0;
                """;
            await _db.ExecuteAsync(softDeleteAll, new { PerfilId = perfilId, Correo = correo, UsuarioId = usuarioId }, tx);
            return;
        }

        foreach (var item in menus)
        {
            const string merge = """
                IF EXISTS (
                    SELECT 1 FROM sgr.PerfilMenus
                    WHERE PerfilID = @PerfilId AND MenuID = @MenuId
                )
                BEGIN
                    UPDATE sgr.PerfilMenus
                       SET bVisible = @Visible,
                           bEliminado = 0,
                           Modificado = @Correo,
                           UsuarioModificacionID = @UsuarioId,
                           FechaModificacion = SYSUTCDATETIME()
                     WHERE PerfilID = @PerfilId AND MenuID = @MenuId;
                END
                ELSE
                BEGIN
                    INSERT INTO sgr.PerfilMenus (
                        PerfilID, MenuID, bVisible, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
                    VALUES (
                        @PerfilId, @MenuId, @Visible, @Correo, @UsuarioId, SYSUTCDATETIME(), 0);
                END
                """;
            await _db.ExecuteAsync(merge, new
            {
                PerfilId = perfilId,
                MenuId = item.MenuId,
                Visible = item.Visible,
                Correo = correo,
                UsuarioId = usuarioId
            }, tx);
        }
    }

    public async Task<int> InsertPerfilAsync(
        string nombre,
        string? descripcion,
        bool bAdministrador,
        string correo,
        int adminId,
        IDbTransaction tx)
    {
        var nombreCol = SqlSchemaCompat.PerfilNombreColumn(_db).Split('.')[1];
        var sql = $"""
            INSERT INTO sgr.Perfiles
                ([{nombreCol}], Descripcion, bAdministrador, Creado, UsuarioCreacionID, FechaCreacion, bEliminado)
            OUTPUT INSERTED.PerfilID
            VALUES
                (@Nombre, @Descripcion, @BAdministrador, @Correo, @AdminId, SYSUTCDATETIME(), 0);
            """;
        return await _db.ExecuteScalarAsync<int>(sql,
            new { Nombre = nombre, Descripcion = descripcion, BAdministrador = bAdministrador, Correo = correo, AdminId = adminId }, tx);
    }

    public async Task<bool> UpdatePerfilAsync(
        int perfilId,
        string nombre,
        string? descripcion,
        bool bAdministrador,
        string correo,
        int adminId,
        IDbTransaction tx)
    {
        var nombreCol = SqlSchemaCompat.PerfilNombreColumn(_db).Split('.')[1];
        var sql = $"""
            UPDATE sgr.Perfiles
            SET [{nombreCol}] = @Nombre,
                Descripcion = @Descripcion,
                bAdministrador = @BAdministrador,
                Modificado = @Correo,
                UsuarioModificacionID = @AdminId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE PerfilID = @PerfilId AND bEliminado = 0;
            """;
        var n = await _db.ExecuteAsync(sql,
            new { PerfilId = perfilId, Nombre = nombre, Descripcion = descripcion, BAdministrador = bAdministrador, Correo = correo, AdminId = adminId }, tx);
        return n > 0;
    }

    public async Task<bool> SoftDeletePerfilAsync(int perfilId, string correo, int adminId, IDbTransaction tx)
    {
        const string sql = """
            UPDATE sgr.Perfiles
            SET bEliminado = 1,
                Modificado = @Correo,
                UsuarioModificacionID = @AdminId,
                FechaModificacion = SYSUTCDATETIME()
            WHERE PerfilID = @PerfilId AND bEliminado = 0;
            """;
        var n = await _db.ExecuteAsync(sql, new { PerfilId = perfilId, Correo = correo, AdminId = adminId }, tx);
        return n > 0;
    }

    public async Task<int> ContarUsuariosConPerfilAsync(int perfilId, CancellationToken ct = default)
    {
        const string sql = """
            SELECT COUNT(1)
            FROM sgr.Usuarios WITH (NOLOCK)
            WHERE PerfilID = @PerfilId AND bEliminado = 0;
            """;
        return await _db.ExecuteScalarAsync<int>(
            new CommandDefinition(sql, new { PerfilId = perfilId }, cancellationToken: ct));
    }
}
