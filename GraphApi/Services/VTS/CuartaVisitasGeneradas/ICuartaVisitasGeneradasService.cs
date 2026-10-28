using GraphApi.Models.VTS.CuartaVisitasGeneradas;

namespace GraphApi.Services.VTS.CuartaVisitasGeneradas;

public interface ICuartaVisitasGeneradasService
{
    Task<(PaseVisitaDto? Pase, string? Code, int Status, string? Detail)> CrearPaseAsync(
        CrearPaseRequest request, int usuarioId, string correo, CancellationToken ct = default);

    Task<IReadOnlyList<PaseVisitaDto>> ListMiasAsync(int usuarioId, CancellationToken ct = default);

    Task<ValidarPaseResponse> ValidarAsync(string codigoQr, CancellationToken ct = default);

    Task<(UsarPaseResponse? Response, string? Code, int Status, string? Detail)> UsarAsync(
        int visitaGeneradaId, string correo, int userId, CancellationToken ct = default);
}
