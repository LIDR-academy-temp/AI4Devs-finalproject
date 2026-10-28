using System.Data;
using GraphApi.Models.VTS.CuartaVisitas;

namespace GraphApi.Repositories.VTS;

public interface ICuartaVisitasRepository
{
    // Visitas
    Task<IReadOnlyList<VisitaListItemDto>> ListarVisitasAsync(
        int? casaId, DateTime? desde, DateTime? hasta, CancellationToken ct = default);

    Task<int?> ResolverTipoIdentificacionIdAsync(string tipoIdentificacion, IDbTransaction? tx = null);

    Task<int> InsertVisitaAsync(
        RegistrarVisitaRequest request,
        int tipoIdentificacionId,
        string correo,
        int userId,
        IDbTransaction tx);

    Task<bool> RegistrarSalidaAsync(int visitaId, string correo, int userId, IDbTransaction tx);

    // Áreas comunes
    Task<IReadOnlyList<AreaComunDto>> ListarAreasAsync(CancellationToken ct = default);

    // Reservaciones
    Task<bool> HaySolapamientoAsync(
        int areaComunId, DateTime inicio, DateTime fin, int? excluirId = null, IDbTransaction? tx = null);

    Task<int?> ResolverEstadoReservacionIdAsync(string estado, IDbTransaction? tx = null);

    Task<int> InsertReservacionAsync(
        CrearReservacionRequest request,
        int estadoId,
        string correo,
        int userId,
        IDbTransaction tx);

    Task<IReadOnlyList<ReservacionAreaDto>> ListarReservacionesMiasAsync(
        int userId, CancellationToken ct = default);
}
