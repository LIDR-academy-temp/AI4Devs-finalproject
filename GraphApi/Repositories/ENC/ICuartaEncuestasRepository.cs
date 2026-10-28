using System.Data;
using GraphApi.Models.ENC.Encuestas;

namespace GraphApi.Repositories.ENC;

public interface ICuartaEncuestasRepository
{
    Task<IReadOnlyList<EncuestaListItemDto>> ListarActivasAsync(int usuarioId, CancellationToken ct = default);

    Task<IReadOnlyList<EncuestaListItemDto>> ListarAdminAsync(CancellationToken ct = default);

    Task<EncuestaDetalleDto?> ObtenerDetalleAsync(int encuestaId, int usuarioId, CancellationToken ct = default);

    Task<int?> ResolverTipoPreguntaIdAsync(string tipoPregunta, IDbTransaction? tx = null);

    Task<int?> ResolverTipoPreguntaIdAsync(string? tipoPregunta, int tipoPreguntaId, IDbTransaction? tx = null);

    Task<int> InsertEncuestaAsync(
        EncuestaCrearRequest request,
        string correo,
        int adminId,
        IDbTransaction tx);

    Task<bool> PublicarAsync(int encuestaId, string correo, int adminId, IDbTransaction tx);

    Task<(bool Abierta, bool Existe)> EstadoEncuestaAsync(int encuestaId, IDbTransaction? tx = null);

    Task<bool> UsuarioYaParticipoAsync(int encuestaId, int usuarioId, IDbTransaction? tx = null);

    Task InsertRespuestasAsync(
        int encuestaId,
        int usuarioId,
        string correo,
        IReadOnlyList<RespuestaItemRequest> respuestas,
        IDbTransaction tx);

    Task<EncuestaResultadosDto?> ObtenerResultadosAsync(int encuestaId, CancellationToken ct = default);

    Task<IReadOnlyList<TipoPreguntaItemDto>> ListarTiposPreguntaAsync(CancellationToken ct = default);

    Task<IReadOnlyList<PreguntaMetaRow>> ObtenerPreguntasMetaAsync(int encuestaId, IDbTransaction? tx = null);

    Task<bool> OpcionPerteneceAPreguntaAsync(
        int encuestaId,
        int preguntaId,
        int opcionPreguntaId,
        IDbTransaction? tx = null);

    Task<bool> EsBorradorEditableAsync(int encuestaId, IDbTransaction? tx = null);

    Task<int> ContarPreguntasAsync(int encuestaId, IDbTransaction? tx = null);

    Task<bool> ActualizarEncuestaAsync(
        int encuestaId,
        EncuestaActualizarRequest request,
        string correo,
        int adminId,
        IDbTransaction tx);

    Task<bool> EliminarEncuestaAsync(int encuestaId, string correo, int adminId, IDbTransaction tx);

    Task<int?> ObtenerEncuestaIdPorPreguntaAsync(int preguntaId, IDbTransaction? tx = null);

    Task<int?> ObtenerPreguntaIdPorOpcionAsync(int opcionPreguntaId, IDbTransaction? tx = null);

    Task<int> InsertPreguntaAsync(
        int encuestaId,
        PreguntaCrearRequest request,
        string correo,
        int adminId,
        IDbTransaction tx);

    Task<bool> ActualizarPreguntaAsync(
        int preguntaId,
        PreguntaActualizarRequest request,
        string correo,
        int adminId,
        IDbTransaction tx);

    Task<bool> EliminarPreguntaAsync(int preguntaId, string correo, int adminId, IDbTransaction tx);

    Task<int> InsertOpcionAsync(
        int preguntaId,
        OpcionCrearRequest request,
        string correo,
        int adminId,
        IDbTransaction tx);

    Task<bool> ActualizarOpcionAsync(
        int opcionPreguntaId,
        OpcionActualizarRequest request,
        string correo,
        int adminId,
        IDbTransaction tx);

    Task<bool> EliminarOpcionAsync(int opcionPreguntaId, string correo, int adminId, IDbTransaction tx);
}

public sealed class PreguntaMetaRow
{
    public int PreguntaId { get; set; }
    public string TipoPregunta { get; set; } = "";
    public bool Requerida { get; set; }
}
