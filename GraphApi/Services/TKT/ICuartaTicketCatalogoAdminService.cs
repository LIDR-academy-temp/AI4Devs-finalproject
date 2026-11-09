using GraphApi.Models.TKT;

namespace GraphApi.Services.TKT;

public interface ICuartaTicketCatalogoAdminService
{
    Task<(CatalogoItemDto? Data, string? Code, int Status, string? Detail)> CrearCategoriaAsync(
        UpsertCategoriaTicketInput input,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(CatalogoItemDto? Data, string? Code, int Status, string? Detail)> ActualizarCategoriaAsync(
        int id,
        UpsertCategoriaTicketInput input,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarCategoriaAsync(
        int id,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(PrioridadCatalogoItemDto? Data, string? Code, int Status, string? Detail)> CrearPrioridadAsync(
        UpsertPrioridadTicketInput input,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(PrioridadCatalogoItemDto? Data, string? Code, int Status, string? Detail)> ActualizarPrioridadAsync(
        int id,
        UpsertPrioridadTicketInput input,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarPrioridadAsync(
        int id,
        int adminId,
        string correo,
        CancellationToken ct = default);
}
