using GraphApi.Models.ENC.Encuestas;

namespace GraphApi.Services.ENC.Encuestas;

public interface ICuartaEncuestasService
{
    Task<IReadOnlyList<EncuestaListItemDto>> ListarActivasAsync(int usuarioId, CancellationToken ct = default);

    Task<IReadOnlyList<EncuestaListItemDto>> ListarAdminAsync(CancellationToken ct = default);

    Task<EncuestaDetalleDto?> ObtenerDetalleAsync(int encuestaId, int usuarioId, bool esAdmin, CancellationToken ct = default);

    Task<(EncuestaDetalleDto? Data, string? Code, int Status, string? Detail)> CrearAsync(
        EncuestaCrearRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> PublicarAsync(
        int encuestaId,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> RegistrarRespuestasAsync(
        int encuestaId,
        int usuarioId,
        string correo,
        EncuestaResponderRequest request,
        CancellationToken ct = default);

    Task<EncuestaResultadosDto?> ObtenerResultadosAsync(int encuestaId, CancellationToken ct = default);

    Task<IReadOnlyList<TipoPreguntaItemDto>> ListarTiposPreguntaAsync(CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarAsync(
        int encuestaId,
        EncuestaActualizarRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(
        int encuestaId,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(int? PreguntaId, string? Code, int Status, string? Detail)> CrearPreguntaAsync(
        int encuestaId,
        PreguntaCrearRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarPreguntaAsync(
        int preguntaId,
        PreguntaActualizarRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarPreguntaAsync(
        int preguntaId,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(int? OpcionId, string? Code, int Status, string? Detail)> CrearOpcionAsync(
        int preguntaId,
        OpcionCrearRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarOpcionAsync(
        int opcionPreguntaId,
        OpcionActualizarRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarOpcionAsync(
        int opcionPreguntaId,
        int adminId,
        string correo,
        CancellationToken ct = default);
}
