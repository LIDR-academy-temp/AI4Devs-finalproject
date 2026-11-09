using System.Data;
using GraphApi.Models.ANM.Anuncios;

namespace GraphApi.Repositories.ANM;

public interface ICuartaAnunciosRepository
{
    Task<IReadOnlyList<AnuncioListItemDto>> ListarAsync(
        int usuarioId,
        bool incluirNoVigentes,
        CancellationToken ct = default);

    Task<AnuncioListItemDto?> ObtenerAsync(
        int anuncioId,
        int usuarioId,
        bool soloVigentes,
        CancellationToken ct = default);

    Task<bool> AnuncioVigenteAsync(int anuncioId, CancellationToken ct = default);

    Task<int?> ResolverTipoIdAsync(string tipoAnuncio, IDbTransaction tx);

    Task<int> InsertAsync(
        string titulo,
        string contenido,
        int tipoAnuncioId,
        DateTime? vigenteHasta,
        string correo,
        int usuarioId,
        IDbTransaction tx);

    Task<bool> UpdateAsync(
        int anuncioId,
        string? titulo,
        string? contenido,
        int? tipoAnuncioId,
        DateTime? vigenteHasta,
        bool actualizarVigenteHasta,
        string correo,
        int usuarioId,
        IDbTransaction tx);

    Task<bool> SoftDeleteAsync(int anuncioId, string correo, int usuarioId, IDbTransaction tx);

    Task MarcarVistoAsync(int anuncioId, int usuarioId, string correo, IDbTransaction tx);

    Task<IReadOnlyList<TipoAnuncioItemDto>> ListarTiposAsync(CancellationToken ct = default);

    Task<int> InsertTipoAsync(string tipoAnuncio, string correo, int adminId, IDbTransaction? tx = null);

    Task<bool> UpdateTipoAsync(int tipoAnuncioId, string tipoAnuncio, string correo, int adminId, IDbTransaction? tx = null);

    Task<bool> SoftDeleteTipoAsync(int tipoAnuncioId, string correo, int adminId, IDbTransaction? tx = null);

    Task<int> ContarAnunciosPorTipoIdAsync(int tipoAnuncioId, CancellationToken ct = default);
}
