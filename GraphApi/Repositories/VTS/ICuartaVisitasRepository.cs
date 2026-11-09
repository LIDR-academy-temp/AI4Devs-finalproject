using System.Data;
using GraphApi.Models.TKT;
using GraphApi.Models.VTS.CuartaVisitas;

namespace GraphApi.Repositories.VTS;

public interface ICuartaVisitasRepository
{
    // Visitas
    Task<IReadOnlyList<VisitaListItemDto>> ListarVisitasAsync(
        int? casaId, DateTime? desde, DateTime? hasta, CancellationToken ct = default);

    Task<int?> ResolverTipoIdentificacionIdAsync(string tipoIdentificacion, IDbTransaction? tx = null);
    Task<IReadOnlyList<TipoIdentificacionDto>> ListarTiposIdentificacionAsync(CancellationToken ct = default);
    Task<int> InsertTipoIdentificacionAsync(string tipo, string correo, int userId, IDbTransaction? tx = null);
    Task<bool> UpdateTipoIdentificacionAsync(int tipoId, string tipo, string correo, int userId, IDbTransaction? tx = null);
    Task<bool> SoftDeleteTipoIdentificacionAsync(int tipoId, string correo, int userId, IDbTransaction? tx = null);

    Task<int> InsertVisitaAsync(
        RegistrarVisitaRequest request,
        int tipoIdentificacionId,
        string correo,
        int userId,
        IDbTransaction tx);

    Task<bool> RegistrarSalidaAsync(int visitaId, string correo, int userId, IDbTransaction tx);

    // Áreas comunes
    Task<IReadOnlyList<AreaComunDto>> ListarAreasAsync(CancellationToken ct = default);
    Task<AreaComunDto?> ObtenerAreaAsync(int areaComunId, CancellationToken ct = default);
    Task<int> InsertAreaComunAsync(AreaComunUpsertRequest request, string correo, int userId, IDbTransaction? tx = null);
    Task<bool> UpdateAreaComunAsync(int areaComunId, AreaComunUpsertRequest request, string correo, int userId, IDbTransaction? tx = null);
    Task<bool> SoftDeleteAreaComunAsync(int areaComunId, string correo, int userId, IDbTransaction? tx = null);

    Task<bool> CancelarReservacionAsync(int reservacionAreaId, string correo, int userId, IDbTransaction? tx = null);

    Task<bool> ActualizarEstadoReservacionAsync(
        int reservacionAreaId, string estadoNombre, string correo, int userId, IDbTransaction? tx = null);

    // Reservaciones
    Task<bool> HaySolapamientoAsync(
        int areaComunId, DateTime inicio, DateTime fin, int? excluirId = null, IDbTransaction? tx = null);

    Task<int?> ResolverEstadoReservacionIdAsync(string estado, IDbTransaction? tx = null);

    Task<int> InsertReservacionAsync(
        CrearReservacionRequest request,
        int estadoId,
        string correoActor,
        int residentUserId,
        int actorUserId,
        IDbTransaction tx);

    Task<ReservacionAreaDto?> ObtenerReservacionAsync(int reservacionAreaId, CancellationToken ct = default);

    Task<IReadOnlyList<ReservacionAreaDto>> ListarReservacionesMiasAsync(
        int userId, CancellationToken ct = default);

    Task<IReadOnlyList<ReservacionCalendarioDto>> ListarReservacionesCalendarioAsync(
        int? areaComunId, DateTime desde, DateTime hasta, CancellationToken ct = default);

    Task<PaginaDto<ReservacionAdminItemDto>> ListarReservacionesAdminAsync(
        ReservacionAdminFiltroDto filtro, CancellationToken ct = default);
}
