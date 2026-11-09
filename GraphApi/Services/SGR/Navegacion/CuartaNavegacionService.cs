using GraphApi.Infrastructure;
using GraphApi.Models.SGR.Navegacion;
using GraphApi.Repositories.SGR;
using Microsoft.AspNetCore.Http;

namespace GraphApi.Services.SGR.Navegacion;

public sealed class CuartaNavegacionService : ICuartaNavegacionService
{
    private readonly ICuartaNavegacionRepository _repo;
    private readonly IUnitOfWork _uow;

    public CuartaNavegacionService(ICuartaNavegacionRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public async Task<(IReadOnlyList<MenuNodoDto>? Data, string? Code, int Status, string? Detail)> ObtenerMenusUsuarioAsync(
        string? perfilClaim,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(perfilClaim))
        {
            return (null, "PERFIL_NO_RESUELTO", StatusCodes.Status422UnprocessableEntity, "No se pudo resolver el perfil del usuario");
        }

        var perfilId = await _repo.ResolverPerfilIdAsync(perfilClaim.Trim(), ct);
        if (perfilId is null)
        {
            return (null, "PERFIL_NO_RESUELTO", StatusCodes.Status422UnprocessableEntity, "Perfil no encontrado");
        }

        var filas = await _repo.ListarMenusPorPerfilAsync(perfilId.Value, ct);
        var arbol = MenuArbolBuilder.Construir(filas);
        return (arbol, null, StatusCodes.Status200OK, null);
    }

    public Task<IReadOnlyList<MenuAdminListItemDto>> ListarMenusAdminAsync(
        bool incluirEliminados,
        CancellationToken ct = default) =>
        _repo.ListarMenusAdminAsync(incluirEliminados, ct);

    public Task<MenuAdminListItemDto?> ObtenerMenuAdminAsync(int menuId, CancellationToken ct = default) =>
        _repo.ObtenerMenuAdminAsync(menuId, ct);

    public async Task<(MenuAdminListItemDto? Data, string? Code, int Status, string? Detail)> CrearMenuAsync(
        MenuCrearRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            if (request.PadreMenuId is int padreId && !await _repo.MenuExisteAsync(padreId, tx))
            {
                _uow.Rollback();
                return (null, "MENU_PADRE_NO_ENCONTRADO", StatusCodes.Status422UnprocessableEntity, "Menú padre no encontrado");
            }

            var id = await _repo.InsertMenuAsync(request, adminCorreo, adminId, tx);
            _uow.Commit();
            var created = await _repo.ObtenerMenuAdminAsync(id, ct);
            return (created, null, StatusCodes.Status201Created, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(MenuAdminListItemDto? Data, string? Code, int Status, string? Detail)> ActualizarMenuAsync(
        int menuId,
        MenuActualizarRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            if (!await _repo.MenuExisteAsync(menuId, tx))
            {
                _uow.Rollback();
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Menú no encontrado");
            }

            if (request.PadreMenuId is int padreId)
            {
                if (padreId == menuId)
                {
                    _uow.Rollback();
                    return (null, "MENU_PADRE_INVALIDO", StatusCodes.Status422UnprocessableEntity,
                        "Un menú no puede ser padre de sí mismo");
                }

                if (!await _repo.MenuExisteAsync(padreId, tx))
                {
                    _uow.Rollback();
                    return (null, "MENU_PADRE_NO_ENCONTRADO", StatusCodes.Status422UnprocessableEntity, "Menú padre no encontrado");
                }
            }

            var ok = await _repo.ActualizarMenuAsync(menuId, request, adminCorreo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Menú no encontrado");
            }

            _uow.Commit();
            var updated = await _repo.ObtenerMenuAdminAsync(menuId, ct);
            return (updated, null, StatusCodes.Status200OK, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarMenuAsync(
        int menuId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            if (!await _repo.MenuExisteAsync(menuId, tx))
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Menú no encontrado");
            }

            await _repo.SoftDeleteMenuAsync(menuId, adminCorreo, adminId, tx);
            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public Task<IReadOnlyList<PerfilAdminListItemDto>> ListarPerfilesAdminAsync(CancellationToken ct = default)
        => _repo.ListarPerfilesAdminAsync(ct);

    public async Task<IReadOnlyList<PerfilMenuPermisoDto>?> ListarPermisosMenusAsync(int perfilId, CancellationToken ct = default)
    {
        if (!await _repo.PerfilExisteAsync(perfilId, ct))
        {
            return null;
        }

        return await _repo.ListarPermisosMenusPerfilAsync(perfilId, ct);
    }

    public async Task<(IReadOnlyList<PerfilMenuPermisoDto>? Data, string? Code, int Status, string? Detail)> ActualizarPermisosMenusAsync(
        int perfilId,
        PerfilMenuAsignacionRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        if (!await _repo.PerfilExisteAsync(perfilId, ct))
        {
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Perfil no encontrado");
        }

        var menus = request.Menus ?? Array.Empty<PerfilMenuAsignacionItemRequest>();
        var ids = menus.Select(m => m.MenuId).Distinct().ToArray();

        var tx = _uow.BeginTransaction();
        try
        {
            if (ids.Length > 0)
            {
                var count = await _repo.ContarMenusExistentesAsync(ids, tx);
                if (count != ids.Length)
                {
                    _uow.Rollback();
                    return (null, "MENU_NO_ENCONTRADO", StatusCodes.Status422UnprocessableEntity, "Uno o más menús no existen");
                }
            }

            await _repo.SincronizarPerfilMenusAsync(perfilId, menus, adminCorreo, adminId, tx);
            _uow.Commit();
            var list = await _repo.ListarPermisosMenusPerfilAsync(perfilId, ct);
            return (list, null, StatusCodes.Status200OK, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<IReadOnlyList<MenuPerfilPermisoDto>?> ListarPermisosPerfilesMenuAsync(int menuId, CancellationToken ct = default)
    {
        var menu = await _repo.ObtenerMenuAdminAsync(menuId, ct);
        if (menu is null || menu.Eliminado)
        {
            return null;
        }

        return await _repo.ListarPermisosPerfilesMenuAsync(menuId, ct);
    }

    public async Task<(IReadOnlyList<MenuPerfilPermisoDto>? Data, string? Code, int Status, string? Detail)> ActualizarPermisosPerfilesMenuAsync(
        int menuId,
        MenuPerfilAsignacionRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var perfiles = request.Perfiles ?? Array.Empty<MenuPerfilAsignacionItemRequest>();
        var ids = perfiles.Select(p => p.PerfilId).Distinct().ToArray();

        var tx = _uow.BeginTransaction();
        try
        {
            if (!await _repo.MenuExisteAsync(menuId, tx))
            {
                _uow.Rollback();
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Menú no encontrado");
            }

            if (ids.Length > 0)
            {
                var count = await _repo.ContarPerfilesExistentesAsync(ids, tx);
                if (count != ids.Length)
                {
                    _uow.Rollback();
                    return (null, "PERFIL_NO_ENCONTRADO", StatusCodes.Status422UnprocessableEntity, "Uno o más perfiles no existen");
                }
            }

            await _repo.SincronizarMenuPerfilesAsync(menuId, perfiles, adminCorreo, adminId, tx);
            _uow.Commit();
            var list = await _repo.ListarPermisosPerfilesMenuAsync(menuId, ct);
            return (list, null, StatusCodes.Status200OK, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(PerfilAdminListItemDto? Data, string? Code, int Status, string? Detail)> CrearPerfilAdminAsync(
        PerfilAdminUpsertRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var nombre = request.Nombre.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "PERFIL_NOMBRE_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del perfil es requerido.");

        var tx = _uow.BeginTransaction();
        try
        {
            var id = await _repo.InsertPerfilAsync(nombre, request.Descripcion?.Trim(), request.BAdministrador, adminCorreo, adminId, tx);
            _uow.Commit();
            var list = await _repo.ListarPerfilesAdminAsync(ct);
            var item = list.FirstOrDefault(p => p.PerfilId == id);
            return (item, null, StatusCodes.Status201Created, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            _uow.Rollback();
            return (null, "PERFIL_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe un perfil con ese nombre.");
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(PerfilAdminListItemDto? Data, string? Code, int Status, string? Detail)> ActualizarPerfilAdminAsync(
        int perfilId,
        PerfilAdminUpsertRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var nombre = request.Nombre.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "PERFIL_NOMBRE_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del perfil es requerido.");

        if (!await _repo.PerfilExisteAsync(perfilId, ct))
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Perfil no encontrado.");

        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.UpdatePerfilAsync(perfilId, nombre, request.Descripcion?.Trim(), request.BAdministrador, adminCorreo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Perfil no encontrado.");
            }

            _uow.Commit();
            var list = await _repo.ListarPerfilesAdminAsync(ct);
            var item = list.FirstOrDefault(p => p.PerfilId == perfilId);
            return (item, null, StatusCodes.Status200OK, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            _uow.Rollback();
            return (null, "PERFIL_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe un perfil con ese nombre.");
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarPerfilAdminAsync(
        int perfilId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        if (!await _repo.PerfilExisteAsync(perfilId, ct))
            return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Perfil no encontrado.");

        var usuarios = await _repo.ContarUsuariosConPerfilAsync(perfilId, ct);
        if (usuarios > 0)
            return (false, "PERFIL_EN_USO", StatusCodes.Status409Conflict, "No se puede eliminar: hay usuarios asignados a este perfil.");

        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.SoftDeletePerfilAsync(perfilId, adminCorreo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Perfil no encontrado.");
            }

            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }
}
