using System.Data;
using GraphApi.Models.VTS.CuartaVisitasGeneradas;

namespace GraphApi.Repositories.VTS;

public interface ICuartaVisitasGeneradasRepository
{
    Task<int?> ResolverCasaIdUsuarioAsync(int usuarioId, CancellationToken ct = default);
    Task<bool> CasaActivaExisteAsync(int casaId, CancellationToken ct = default);
    Task<int?> ResolverTipoIdentificacionIdAsync(int? tipoId, CancellationToken ct = default);
    Task<bool> ExisteCodigoQrAsync(string codigoQr, IDbTransaction tx);
    Task<int> InsertPaseAsync(
        CrearPaseRequest request,
        int usuarioVisitadoId,
        int casaId,
        int tipoIdentificacionId,
        string numeroIdentificacion,
        string codigoQr,
        DateTime fechaEmision,
        DateTime fechaExpira,
        string correo,
        int userId,
        IDbTransaction tx);
    Task<PaseVisitaDto?> GetByIdAsync(int visitaGeneradaId, CancellationToken ct = default);
    Task<IReadOnlyList<PaseVisitaDto>> ListMiasAsync(int usuarioVisitadoId, CancellationToken ct = default);
    Task<IReadOnlyList<PaseVisitaDto>> ListAdminAsync(
        int? casaId, DateTime? desde, DateTime? hasta, CancellationToken ct = default);
    Task<PaseVisitaDto?> GetByCodigoAsync(string codigoQr, CancellationToken ct = default);
    Task<int> MarcarUsadoAsync(int visitaGeneradaId, string correo, int userId, IDbTransaction tx);
    Task InsertLogUsoAsync(int visitaGeneradaId, string correo, int userId, IDbTransaction tx);
    Task<int> UpdatePaseAsync(
        int visitaGeneradaId,
        CrearPaseRequest request,
        int usuarioVisitadoId,
        int casaId,
        int tipoIdentificacionId,
        string numeroIdentificacion,
        DateTime fechaEmision,
        DateTime fechaExpira,
        string correo,
        int userId);
    Task<bool> SoftDeletePaseAsync(int visitaGeneradaId, string correo, int userId);
}
