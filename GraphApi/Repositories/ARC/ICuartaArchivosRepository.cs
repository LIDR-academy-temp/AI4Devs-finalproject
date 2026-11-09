using System.Data;
using GraphApi.Models.ARC.CuartaArchivos;

namespace GraphApi.Repositories.ARC;

public interface ICuartaArchivosRepository
{
    Task<IReadOnlyList<ArchivoListItemDto>> ListarAsync(string? tipoArchivo, CancellationToken ct = default);

    Task<IReadOnlyList<TipoArchivoItemDto>> ListarTiposAsync(CancellationToken ct = default);

    Task<ArchivoListItemDto?> ObtenerAsync(int archivoId, CancellationToken ct = default);

    Task<int?> ResolverTipoArchivoIdAsync(string tipoArchivo, IDbTransaction? tx = null);

    Task<int> InsertArchivoAsync(
        string nombre,
        string ruta,
        int tipoArchivoId,
        bool esPrivado,
        string correo,
        int adminId,
        IDbTransaction tx);

    Task<bool> SoftDeleteAsync(int archivoId, string correo, int adminId, IDbTransaction tx);

    Task<bool> UpdateArchivoAsync(
        int archivoId,
        string nombre,
        int tipoArchivoId,
        bool esPrivado,
        string correo,
        int adminId,
        IDbTransaction? tx = null);

    Task InsertLogVisualizacionAsync(int archivoId, int usuarioId, string correo, string? medio, string? ip, string? ua, IDbTransaction? tx = null);

    Task<int> InsertTipoAsync(string tipoArchivo, string correo, int adminId, IDbTransaction? tx = null);

    Task<bool> UpdateTipoAsync(int tipoArchivoId, string tipoArchivo, string correo, int adminId, IDbTransaction? tx = null);

    Task<bool> SoftDeleteTipoAsync(int tipoArchivoId, string correo, int adminId, IDbTransaction? tx = null);
}
