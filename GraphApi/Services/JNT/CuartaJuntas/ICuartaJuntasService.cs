using GraphApi.Models.JNT.CuartaJuntas;

namespace GraphApi.Services.JNT.CuartaJuntas;

public interface ICuartaJuntasService
{
    Task<IReadOnlyList<JuntaListItemDto>> ListarAsync(CancellationToken ct = default);

    Task<JuntaDetalleDto?> ObtenerAsync(int juntaId, CancellationToken ct = default);

    Task<(JuntaDetalleDto? Junta, string? Code, int Status, string? Detail)> CrearAsync(
        JuntaCrearRequest request,
        string correo,
        int adminId,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarAsync(
        int juntaId,
        JuntaActualizarRequest request,
        string correo,
        int adminId,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(
        int juntaId,
        string correo,
        int adminId,
        CancellationToken ct = default);
}
