using GraphApi.Models.TKT;
using GraphApi.Repositories.TKT;

namespace GraphApi.Services.TKT;

public sealed class CuartaTicketCatalogoAdminService : ICuartaTicketCatalogoAdminService
{
    private readonly ITicketCatalogoRepository _repo;

    public CuartaTicketCatalogoAdminService(ITicketCatalogoRepository repo) => _repo = repo;

    public async Task<(CatalogoItemDto? Data, string? Code, int Status, string? Detail)> CrearCategoriaAsync(
        UpsertCategoriaTicketInput input,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var nombre = input.Nombre.Trim();
        try
        {
            var id = await _repo.InsertCategoriaAsync(nombre, correo, adminId);
            return (new CatalogoItemDto { Id = id, Nombre = nombre }, null, StatusCodes.Status201Created, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "CATALOG_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe una categoría con ese nombre.");
        }
    }

    public async Task<(CatalogoItemDto? Data, string? Code, int Status, string? Detail)> ActualizarCategoriaAsync(
        int id,
        UpsertCategoriaTicketInput input,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var nombre = input.Nombre.Trim();
        try
        {
            var ok = await _repo.UpdateCategoriaAsync(id, nombre, correo, adminId);
            if (!ok)
            {
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Categoría no encontrada.");
            }

            return (new CatalogoItemDto { Id = id, Nombre = nombre }, null, StatusCodes.Status200OK, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "CATALOG_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe una categoría con ese nombre.");
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarCategoriaAsync(
        int id,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        if (await _repo.ExistsTicketsConCategoriaAsync(id))
        {
            return (false, "CATALOG_IN_USE", StatusCodes.Status409Conflict,
                "No se puede eliminar: hay tickets que usan esta categoría.");
        }

        var ok = await _repo.SoftDeleteCategoriaAsync(id, correo, adminId);
        return ok
            ? (true, null, StatusCodes.Status204NoContent, null)
            : (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Categoría no encontrada.");
    }

    public async Task<(PrioridadCatalogoItemDto? Data, string? Code, int Status, string? Detail)> CrearPrioridadAsync(
        UpsertPrioridadTicketInput input,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var nombre = input.Nombre.Trim();
        try
        {
            var id = await _repo.InsertPrioridadAsync(nombre, input.Orden, correo, adminId);
            return (new PrioridadCatalogoItemDto { Id = id, Nombre = nombre, Orden = input.Orden }, null,
                StatusCodes.Status201Created, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "CATALOG_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe una prioridad con ese nombre.");
        }
    }

    public async Task<(PrioridadCatalogoItemDto? Data, string? Code, int Status, string? Detail)> ActualizarPrioridadAsync(
        int id,
        UpsertPrioridadTicketInput input,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var nombre = input.Nombre.Trim();
        try
        {
            var ok = await _repo.UpdatePrioridadAsync(id, nombre, input.Orden, correo, adminId);
            if (!ok)
            {
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Prioridad no encontrada.");
            }

            return (new PrioridadCatalogoItemDto { Id = id, Nombre = nombre, Orden = input.Orden }, null,
                StatusCodes.Status200OK, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "CATALOG_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe una prioridad con ese nombre.");
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarPrioridadAsync(
        int id,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        if (await _repo.ExistsTicketsConPrioridadAsync(id))
        {
            return (false, "CATALOG_IN_USE", StatusCodes.Status409Conflict,
                "No se puede eliminar: hay tickets que usan esta prioridad.");
        }

        var ok = await _repo.SoftDeletePrioridadAsync(id, correo, adminId);
        return ok
            ? (true, null, StatusCodes.Status204NoContent, null)
            : (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Prioridad no encontrada.");
    }
}
