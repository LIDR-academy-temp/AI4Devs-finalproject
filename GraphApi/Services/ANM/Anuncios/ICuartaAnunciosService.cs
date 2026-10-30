using GraphApi.Models.ANM.Anuncios;

namespace GraphApi.Services.ANM.Anuncios;

public interface ICuartaAnunciosService
{
    Task<IReadOnlyList<AnuncioListItemDto>> ListarAsync(int usuarioId, bool incluirNoVigentes, CancellationToken ct = default);

    Task<AnuncioListItemDto?> ObtenerAsync(int anuncioId, int usuarioId, bool soloVigentes, CancellationToken ct = default);

    Task<(AnuncioListItemDto? Data, string? Code, int Status, string? Detail)> CrearAsync(
        AnuncioCrearRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<(AnuncioListItemDto? Data, string? Code, int Status, string? Detail)> ActualizarAsync(
        int anuncioId,
        AnuncioActualizarRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(
        int anuncioId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> MarcarVistoAsync(
        int anuncioId,
        int usuarioId,
        string correo,
        CancellationToken ct = default);

    Task<IReadOnlyList<TipoAnuncioItemDto>> ListarTiposAsync(CancellationToken ct = default);

    Task<(TipoAnuncioItemDto? Data, string? Code, int Status, string? Detail)> CrearTipoAsync(
        string tipoAnuncio, int adminId, string correo, CancellationToken ct = default);

    Task<(TipoAnuncioItemDto? Data, string? Code, int Status, string? Detail)> ActualizarTipoAsync(
        int tipoAnuncioId, string tipoAnuncio, int adminId, string correo, CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarTipoAsync(
        int tipoAnuncioId, int adminId, string correo, CancellationToken ct = default);
}
