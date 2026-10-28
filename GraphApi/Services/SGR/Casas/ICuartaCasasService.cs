using GraphApi.Models.SGR.Casas;

namespace GraphApi.Services.SGR.Casas;

public interface ICuartaCasasService
{
    Task<IReadOnlyList<CondominioItemDto>> ListarCondominiosAsync(CancellationToken ct = default);

    Task<IReadOnlyList<CasaListItemDto>> ListarCasasAsync(
        int? condominioId,
        string? numero,
        bool incluirEliminados,
        CancellationToken ct = default);

    Task<CasaListItemDto?> ObtenerCasaAsync(int casaId, CancellationToken ct = default);

    Task<(CasaListItemDto? Data, string? Code, int Status, string? Detail)> CrearAsync(
        CasaCrearRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<(CasaListItemDto? Data, string? Code, int Status, string? Detail)> ActualizarAsync(
        int casaId,
        CasaActualizarRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(
        int casaId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);
}
