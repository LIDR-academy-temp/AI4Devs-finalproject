using System.Data;
using GraphApi.Models.JNT.CuartaJuntas;

namespace GraphApi.Repositories.JNT;

public interface ICuartaJuntasRepository
{
    Task<IReadOnlyList<JuntaListItemDto>> ListarAsync(CancellationToken ct = default);

    Task<JuntaDetalleDto?> ObtenerAsync(int juntaId, CancellationToken ct = default);

    Task<int> InsertJuntaAsync(
        JuntaCrearRequest request,
        string correo,
        int adminId,
        IDbTransaction tx);

    Task InsertDetalleAsync(
        int juntaId,
        string contenido,
        string correo,
        int adminId,
        IDbTransaction tx);

    Task<bool> ActualizarAsync(
        int juntaId,
        JuntaActualizarRequest request,
        string correo,
        int adminId,
        IDbTransaction tx);

    Task<bool> SoftDeleteAsync(
        int juntaId,
        string correo,
        int adminId,
        IDbTransaction tx);
}
