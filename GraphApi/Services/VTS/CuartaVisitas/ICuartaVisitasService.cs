using GraphApi.Models.VTS.CuartaVisitas;

namespace GraphApi.Services.VTS.CuartaVisitas;

public interface ICuartaVisitasService
{
    Task<IReadOnlyList<VisitaListItemDto>> ListarVisitasAsync(
        int? casaId, DateTime? desde, DateTime? hasta, CancellationToken ct = default);

    Task<(VisitaListItemDto? Visita, string? Code, int Status, string? Detail)> RegistrarEntradaAsync(
        RegistrarVisitaRequest request, string correo, int userId, CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> RegistrarSalidaAsync(
        int visitaId, string correo, int userId, CancellationToken ct = default);

    Task<IReadOnlyList<AreaComunDto>> ListarAreasAsync(CancellationToken ct = default);

    Task<(ReservacionAreaDto? Reservacion, string? Code, int Status, string? Detail)> CrearReservacionAsync(
        CrearReservacionRequest request, string correo, int userId, CancellationToken ct = default);

    Task<IReadOnlyList<ReservacionAreaDto>> ListarReservacionesMiasAsync(
        int userId, CancellationToken ct = default);
}
