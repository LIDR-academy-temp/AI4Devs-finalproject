using System.Data;
using GraphApi.Models.SGR.Casas;

namespace GraphApi.Repositories.SGR;

public interface ICasasCuartaRepository
{
    Task<IReadOnlyList<CondominioItemDto>> ListarCondominiosAsync(CancellationToken ct = default);

    Task<IReadOnlyList<CasaListItemDto>> ListarCasasAsync(
        int? condominioId,
        string? numero,
        bool incluirEliminados,
        CancellationToken ct = default);

    Task<CasaListItemDto?> ObtenerCasaAsync(int casaId, CancellationToken ct = default);

    Task<CasaListItemDto?> ObtenerCasaPorIdAsync(int casaId, IDbTransaction? tx, CancellationToken ct = default);

    Task<bool> CondominioExisteAsync(int condominioId, IDbTransaction tx);

    Task<bool> UsuarioExisteAsync(int usuarioId, IDbTransaction tx);

    Task<int> InsertCasaAsync(
        int condominioId,
        string direccion,
        string numero,
        int? propietarioUsuarioId,
        string creadoCorreo,
        int creadoPorId,
        IDbTransaction tx);

    Task<bool> UpdateCasaAsync(
        int casaId,
        string? direccion,
        string? numero,
        int? propietarioUsuarioId,
        string modificadoCorreo,
        int modificadoPorId,
        IDbTransaction tx);

    Task<bool> TieneOcupanteVigenteAsync(int casaId, IDbTransaction tx);

    Task<bool> TieneCuotasActivasAsync(int casaId, IDbTransaction tx);

    Task<bool> SoftDeleteCasaAsync(int casaId, string modificadoCorreo, int modificadoPorId, IDbTransaction tx);
}
