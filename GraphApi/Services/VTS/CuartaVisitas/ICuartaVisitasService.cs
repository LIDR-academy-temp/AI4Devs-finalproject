using GraphApi.Models.TKT;
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

    Task<(IReadOnlyList<ReservacionCalendarioDto>? Eventos, string? Code, int Status, string? Detail)>
        ListarReservacionesCalendarioAsync(
            int areaComunId, DateTime desde, DateTime hasta, CancellationToken ct = default);

    Task<PaginaDto<ReservacionAdminItemDto>> ListarReservacionesAdminAsync(
        ReservacionAdminFiltroDto filtro, CancellationToken ct = default);

    Task<IReadOnlyList<TipoIdentificacionDto>> ListarTiposIdentificacionAsync(CancellationToken ct = default);

    Task<(TipoIdentificacionDto? Data, string? Code, int Status, string? Detail)> CrearTipoIdentificacionAsync(
        string tipo, string correo, int userId, CancellationToken ct = default);

    Task<(TipoIdentificacionDto? Data, string? Code, int Status, string? Detail)> ActualizarTipoIdentificacionAsync(
        int tipoId, string tipo, string correo, int userId, CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarTipoIdentificacionAsync(
        int tipoId, string correo, int userId, CancellationToken ct = default);
}
