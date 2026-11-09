using GraphApi.Infrastructure;
using GraphApi.Models.ENC.Encuestas;
using GraphApi.Models.NTF;
using GraphApi.Repositories.ENC;
using GraphApi.Services.NTF;
using Microsoft.Extensions.Logging;

namespace GraphApi.Services.ENC.Encuestas;

public sealed class CuartaEncuestasService : ICuartaEncuestasService
{
    private readonly ICuartaEncuestasRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly INotificacionService _notificaciones;
    private readonly ILogger<CuartaEncuestasService> _logger;

    public CuartaEncuestasService(
        ICuartaEncuestasRepository repo,
        IUnitOfWork uow,
        INotificacionService notificaciones,
        ILogger<CuartaEncuestasService> logger)
    {
        _repo = repo;
        _uow = uow;
        _notificaciones = notificaciones;
        _logger = logger;
    }

    public Task<IReadOnlyList<EncuestaListItemDto>> ListarActivasAsync(int usuarioId, CancellationToken ct = default) =>
        _repo.ListarActivasAsync(usuarioId, ct);

    public Task<IReadOnlyList<EncuestaListItemDto>> ListarAdminAsync(CancellationToken ct = default) =>
        _repo.ListarAdminAsync(ct);

    public async Task<EncuestaDetalleDto?> ObtenerDetalleAsync(
        int encuestaId,
        int usuarioId,
        bool esAdmin,
        CancellationToken ct = default)
    {
        var detalle = await _repo.ObtenerDetalleAsync(encuestaId, usuarioId, ct);
        if (detalle is null)
        {
            return null;
        }

        if (!esAdmin)
        {
            var (abierta, existe) = await _repo.EstadoEncuestaAsync(encuestaId);
            if (!existe)
            {
                return null;
            }

            if (!abierta && !detalle.YaParticipo)
            {
                return null;
            }
        }

        return detalle;
    }

    public async Task<(EncuestaDetalleDto? Data, string? Code, int Status, string? Detail)> CrearAsync(
        EncuestaCrearRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        foreach (var p in request.Preguntas)
        {
            var tipoId = await _repo.ResolverTipoPreguntaIdAsync(p.TipoPregunta, p.TipoPreguntaId);
            if (tipoId is null)
            {
                return (null, "TIPO_PREGUNTA_INVALIDO", StatusCodes.Status400BadRequest, "Tipo de pregunta no válido");
            }

            var esTexto = EsTextoLibre(p.TipoPregunta);
            if (!esTexto && (p.Opciones is null || p.Opciones.Count == 0))
            {
                return (null, "OPCIONES_REQUERIDAS", StatusCodes.Status400BadRequest,
                    "Las preguntas de opción múltiple requieren al menos una opción");
            }
        }

        var tx = _uow.BeginTransaction();
        try
        {
            var id = await _repo.InsertEncuestaAsync(request, correo, adminId, tx);
            _uow.Commit();
            var detalle = await _repo.ObtenerDetalleAsync(id, adminId, ct);
            return (detalle, null, StatusCodes.Status201Created, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> PublicarAsync(
        int encuestaId,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        if (await _repo.ContarPreguntasAsync(encuestaId) == 0)
        {
            return (false, "SIN_PREGUNTAS", StatusCodes.Status422UnprocessableEntity,
                "Agrega al menos una pregunta antes de publicar");
        }

        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.PublicarAsync(encuestaId, correo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "NO_PUBLICABLE", StatusCodes.Status404NotFound,
                    "Encuesta no encontrada o ya publicada");
            }

            _uow.Commit();
        }
        catch
        {
            _uow.Rollback();
            throw;
        }

        try
        {
            var detalle = await _repo.ObtenerDetalleAsync(encuestaId, adminId, ct);
            var titulo = detalle?.Titulo ?? "Nueva encuesta";
            await _notificaciones.AvisoGeneralAsync(
                titulo,
                "Hay una nueva encuesta disponible. Participa desde el portal.",
                new NotificacionAutor(adminId, correo),
                ct);
        }
        catch (Exception ex)
        {
            _logger.LogWarning(ex, "AvisoGeneralAsync falló tras publicar encuesta {EncuestaId}", encuestaId);
        }

        return (true, null, StatusCodes.Status204NoContent, null);
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> RegistrarRespuestasAsync(
        int encuestaId,
        int usuarioId,
        string correo,
        EncuestaResponderRequest request,
        CancellationToken ct = default)
    {
        var (abierta, existe) = await _repo.EstadoEncuestaAsync(encuestaId);
        if (!existe)
        {
            return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Encuesta no encontrada");
        }

        if (!abierta)
        {
            return (false, "ENCUESTA_CERRADA", StatusCodes.Status422UnprocessableEntity,
                "La encuesta no está vigente o no está publicada");
        }

        if (await _repo.UsuarioYaParticipoAsync(encuestaId, usuarioId))
        {
            return (false, "YA_PARTICIPO", StatusCodes.Status409Conflict,
                "Ya participaste. Tu respuesta fue registrada.");
        }

        var meta = await _repo.ObtenerPreguntasMetaAsync(encuestaId);
        var metaDict = meta.ToDictionary(m => m.PreguntaId);
        var enviadas = request.Respuestas.GroupBy(r => r.PreguntaId).ToDictionary(g => g.Key, g => g.First());

        foreach (var m in meta.Where(x => x.Requerida))
        {
            if (!enviadas.ContainsKey(m.PreguntaId))
            {
                return (false, "PREGUNTA_REQUERIDA", StatusCodes.Status400BadRequest,
                    "Faltan respuestas a preguntas obligatorias");
            }
        }

        foreach (var r in request.Respuestas)
        {
            if (!metaDict.TryGetValue(r.PreguntaId, out var m))
            {
                return (false, "PREGUNTA_INVALIDA", StatusCodes.Status400BadRequest, "Pregunta no pertenece a la encuesta");
            }

            if (EsTextoLibre(m.TipoPregunta))
            {
                if (string.IsNullOrWhiteSpace(r.RespuestaTexto))
                {
                    return (false, "RESPUESTA_TEXTO_REQUERIDA", StatusCodes.Status400BadRequest,
                        "Respuesta de texto requerida");
                }
            }
            else if (r.OpcionPreguntaId is null)
            {
                return (false, "OPCION_REQUERIDA", StatusCodes.Status400BadRequest, "Debe elegir una opción");
            }
            else if (!await _repo.OpcionPerteneceAPreguntaAsync(encuestaId, r.PreguntaId, r.OpcionPreguntaId.Value))
            {
                return (false, "OPCION_INVALIDA", StatusCodes.Status400BadRequest, "Opción no válida para la pregunta");
            }
        }

        var tx = _uow.BeginTransaction();
        try
        {
            if (await _repo.UsuarioYaParticipoAsync(encuestaId, usuarioId, tx))
            {
                _uow.Rollback();
                return (false, "YA_PARTICIPO", StatusCodes.Status409Conflict,
                    "Ya participaste. Tu respuesta fue registrada.");
            }

            await _repo.InsertRespuestasAsync(encuestaId, usuarioId, correo, request.Respuestas, tx);
            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public Task<EncuestaResultadosDto?> ObtenerResultadosAsync(int encuestaId, CancellationToken ct = default) =>
        _repo.ObtenerResultadosAsync(encuestaId, ct);

    public async Task<(EncuestaResultadosDto? Data, string? Code, int Status, string? Detail)> ObtenerResultadosParaUsuarioAsync(
        int encuestaId,
        int usuarioId,
        bool esAdmin,
        CancellationToken ct = default)
    {
        var (abierta, existe) = await _repo.EstadoEncuestaAsync(encuestaId);
        if (!existe)
        {
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Encuesta no encontrada");
        }

        if (!esAdmin)
        {
            if (!await _repo.EncuestaEstaPublicadaAsync(encuestaId, ct))
            {
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Encuesta no encontrada");
            }

            var yaParticipo = await _repo.UsuarioYaParticipoAsync(encuestaId, usuarioId);
            if (abierta && !yaParticipo)
            {
                return (null, "ENCUESTA_RESULTADOS_BLOQUEADOS", StatusCodes.Status403Forbidden,
                    "Debes participar para ver los resultados mientras la encuesta esté vigente.");
            }
        }

        var data = await _repo.ObtenerResultadosAsync(encuestaId, ct);
        if (data is null)
        {
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Encuesta no encontrada");
        }

        if (!esAdmin)
        {
            data = SanitizarResultadosPublicos(data);
        }

        return (data, null, StatusCodes.Status200OK, null);
    }

    private static EncuestaResultadosDto SanitizarResultadosPublicos(EncuestaResultadosDto data)
    {
        var preguntas = data.Preguntas.Select(p =>
        {
            if (!p.TipoPregunta.Contains("texto", StringComparison.OrdinalIgnoreCase))
            {
                return p;
            }

            var count = p.RespuestasTexto.Count;
            return new ResultadoPreguntaDto
            {
                PreguntaId = p.PreguntaId,
                Texto = p.Texto,
                TipoPregunta = p.TipoPregunta,
                Opciones = p.Opciones,
                RespuestasTexto = Array.Empty<string>(),
                TotalRespuestasTexto = count,
            };
        }).ToList();

        return new EncuestaResultadosDto
        {
            EncuestaId = data.EncuestaId,
            Titulo = data.Titulo,
            TotalParticipantes = data.TotalParticipantes,
            Preguntas = preguntas,
        };
    }

    public Task<IReadOnlyList<TipoPreguntaItemDto>> ListarTiposPreguntaAsync(CancellationToken ct = default) =>
        _repo.ListarTiposPreguntaAsync(ct);

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarAsync(
        int encuestaId,
        EncuestaActualizarRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        if (!await _repo.EsBorradorEditableAsync(encuestaId))
        {
            return (false, "NO_EDITABLE", StatusCodes.Status422UnprocessableEntity,
                "Solo se pueden editar encuestas en borrador");
        }

        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.ActualizarEncuestaAsync(encuestaId, request, correo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Encuesta no encontrada");
            }

            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(
        int encuestaId,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        if (!await _repo.EsBorradorEditableAsync(encuestaId))
        {
            return (false, "NO_EDITABLE", StatusCodes.Status422UnprocessableEntity,
                "Solo se pueden eliminar encuestas en borrador");
        }

        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.EliminarEncuestaAsync(encuestaId, correo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Encuesta no encontrada");
            }

            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(int? PreguntaId, string? Code, int Status, string? Detail)> CrearPreguntaAsync(
        int encuestaId,
        PreguntaCrearRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        if (!await _repo.EsBorradorEditableAsync(encuestaId))
        {
            return (null, "NO_EDITABLE", StatusCodes.Status422UnprocessableEntity,
                "Solo se pueden editar encuestas en borrador");
        }

        var tipoId = await _repo.ResolverTipoPreguntaIdAsync(request.TipoPregunta, request.TipoPreguntaId);
        if (tipoId is null)
        {
            return (null, "TIPO_PREGUNTA_INVALIDO", StatusCodes.Status400BadRequest, "Tipo de pregunta no válido");
        }

        if (!EsTextoLibre(request.TipoPregunta) && (request.Opciones is null || request.Opciones.Count == 0))
        {
            return (null, "OPCIONES_REQUERIDAS", StatusCodes.Status400BadRequest,
                "Las preguntas de opción múltiple requieren al menos una opción");
        }

        var tx = _uow.BeginTransaction();
        try
        {
            var id = await _repo.InsertPreguntaAsync(encuestaId, request, correo, adminId, tx);
            _uow.Commit();
            return (id, null, StatusCodes.Status201Created, null);
        }
        catch (InvalidOperationException ex) when (ex.Message == "TIPO_PREGUNTA_INVALIDO")
        {
            _uow.Rollback();
            return (null, "TIPO_PREGUNTA_INVALIDO", StatusCodes.Status400BadRequest, "Tipo de pregunta no válido");
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarPreguntaAsync(
        int preguntaId,
        PreguntaActualizarRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var encuestaId = await _repo.ObtenerEncuestaIdPorPreguntaAsync(preguntaId);
        if (encuestaId is null)
        {
            return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Pregunta no encontrada");
        }

        if (!await _repo.EsBorradorEditableAsync(encuestaId.Value))
        {
            return (false, "NO_EDITABLE", StatusCodes.Status422UnprocessableEntity,
                "Solo se pueden editar encuestas en borrador");
        }

        if (await _repo.ResolverTipoPreguntaIdAsync(request.TipoPregunta, request.TipoPreguntaId) is null)
        {
            return (false, "TIPO_PREGUNTA_INVALIDO", StatusCodes.Status400BadRequest, "Tipo de pregunta no válido");
        }

        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.ActualizarPreguntaAsync(preguntaId, request, correo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Pregunta no encontrada");
            }

            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarPreguntaAsync(
        int preguntaId,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var encuestaId = await _repo.ObtenerEncuestaIdPorPreguntaAsync(preguntaId);
        if (encuestaId is null)
        {
            return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Pregunta no encontrada");
        }

        if (!await _repo.EsBorradorEditableAsync(encuestaId.Value))
        {
            return (false, "NO_EDITABLE", StatusCodes.Status422UnprocessableEntity,
                "Solo se pueden editar encuestas en borrador");
        }

        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.EliminarPreguntaAsync(preguntaId, correo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Pregunta no encontrada");
            }

            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(int? OpcionId, string? Code, int Status, string? Detail)> CrearOpcionAsync(
        int preguntaId,
        OpcionCrearRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var encuestaId = await _repo.ObtenerEncuestaIdPorPreguntaAsync(preguntaId);
        if (encuestaId is null)
        {
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Pregunta no encontrada");
        }

        if (!await _repo.EsBorradorEditableAsync(encuestaId.Value))
        {
            return (null, "NO_EDITABLE", StatusCodes.Status422UnprocessableEntity,
                "Solo se pueden editar encuestas en borrador");
        }

        var tx = _uow.BeginTransaction();
        try
        {
            var id = await _repo.InsertOpcionAsync(preguntaId, request, correo, adminId, tx);
            _uow.Commit();
            return (id, null, StatusCodes.Status201Created, null);
        }
        catch (InvalidOperationException)
        {
            _uow.Rollback();
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Pregunta no encontrada");
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarOpcionAsync(
        int opcionPreguntaId,
        OpcionActualizarRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var preguntaId = await _repo.ObtenerPreguntaIdPorOpcionAsync(opcionPreguntaId);
        if (preguntaId is null)
        {
            return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Opción no encontrada");
        }

        var encuestaId = await _repo.ObtenerEncuestaIdPorPreguntaAsync(preguntaId.Value);
        if (encuestaId is null || !await _repo.EsBorradorEditableAsync(encuestaId.Value))
        {
            return (false, "NO_EDITABLE", StatusCodes.Status422UnprocessableEntity,
                "Solo se pueden editar encuestas en borrador");
        }

        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.ActualizarOpcionAsync(opcionPreguntaId, request, correo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Opción no encontrada");
            }

            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarOpcionAsync(
        int opcionPreguntaId,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var preguntaId = await _repo.ObtenerPreguntaIdPorOpcionAsync(opcionPreguntaId);
        if (preguntaId is null)
        {
            return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Opción no encontrada");
        }

        var encuestaId = await _repo.ObtenerEncuestaIdPorPreguntaAsync(preguntaId.Value);
        if (encuestaId is null || !await _repo.EsBorradorEditableAsync(encuestaId.Value))
        {
            return (false, "NO_EDITABLE", StatusCodes.Status422UnprocessableEntity,
                "Solo se pueden editar encuestas en borrador");
        }

        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.EliminarOpcionAsync(opcionPreguntaId, correo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Opción no encontrada");
            }

            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    private static bool EsTextoLibre(string tipoPregunta) =>
        tipoPregunta.Contains("texto", StringComparison.OrdinalIgnoreCase);
}
