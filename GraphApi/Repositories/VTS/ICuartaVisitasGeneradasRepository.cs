using System.Data;
using GraphApi.Models.VTS.CuartaVisitasGeneradas;

namespace GraphApi.Repositories.VTS;

public interface ICuartaVisitasGeneradasRepository
{
    Task<int?> ResolverCasaIdUsuarioAsync(int usuarioId, CancellationToken ct = default);
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
    Task<PaseVisitaDto?> GetByCodigoAsync(string codigoQr, CancellationToken ct = default);
    Task<int> MarcarUsadoAsync(int visitaGeneradaId, string correo, int userId, IDbTransaction tx);
}
