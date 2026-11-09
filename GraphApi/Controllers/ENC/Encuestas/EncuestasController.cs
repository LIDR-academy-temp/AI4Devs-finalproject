using FluentValidation;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.ENC.Encuestas;
using GraphApi.Services.ENC.Encuestas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.ENC.Encuestas;

[ApiController]
[Authorize]
[Route("ENC/[controller]")]
[Produces("application/json")]
[SwaggerTag("Operaciones sobre Encuestas")]
public class EncuestasController : Controller
{
    private readonly IEncuestasService _legacy;
    private readonly ICuartaEncuestasService _cuarta;
    private readonly IValidator<EncuestaCrearRequest> _crearValidator;
    private readonly IValidator<EncuestaResponderRequest> _responderValidator;
    private readonly IValidator<EncuestaActualizarRequest> _actualizarValidator;
    private readonly IValidator<PreguntaCrearRequest> _preguntaCrearValidator;
    private readonly IValidator<PreguntaActualizarRequest> _preguntaActualizarValidator;
    private readonly IValidator<OpcionActualizarRequest> _opcionActualizarValidator;

    public EncuestasController(
        IEncuestasService legacy,
        ICuartaEncuestasService cuarta,
        IValidator<EncuestaCrearRequest> crearValidator,
        IValidator<EncuestaResponderRequest> responderValidator,
        IValidator<EncuestaActualizarRequest> actualizarValidator,
        IValidator<PreguntaCrearRequest> preguntaCrearValidator,
        IValidator<PreguntaActualizarRequest> preguntaActualizarValidator,
        IValidator<OpcionActualizarRequest> opcionActualizarValidator)
    {
        _legacy = legacy;
        _cuarta = cuarta;
        _crearValidator = crearValidator;
        _responderValidator = responderValidator;
        _actualizarValidator = actualizarValidator;
        _preguntaCrearValidator = preguntaCrearValidator;
        _preguntaActualizarValidator = preguntaActualizarValidator;
        _opcionActualizarValidator = opcionActualizarValidator;
    }

    [HttpGet("activas")]
    [ProducesResponseType(typeof(IEnumerable<EncuestaListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarActivas(CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
        {
            return Unauthorized();
        }

        var list = await _cuarta.ListarActivasAsync(usuarioId, ct);
        return Ok(list);
    }

    [HttpGet]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IEnumerable<EncuestaListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarAdmin(CancellationToken ct)
    {
        var list = await _cuarta.ListarAdminAsync(ct);
        return Ok(list);
    }

    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(EncuestaDetalleDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Obtener(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
        {
            return Unauthorized();
        }

        var esAdmin = User.IsInRole("Administrador");
        var detalle = await _cuarta.ObtenerDetalleAsync(id, usuarioId, esAdmin, ct);
        return detalle is null ? NotFound() : Ok(detalle);
    }

    [HttpGet("{id:int}/resultados")]
    [ProducesResponseType(typeof(EncuestaResultadosDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status403Forbidden)]
    public async Task<IActionResult> Resultados(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
        {
            return Unauthorized();
        }

        var esAdmin = User.IsInRole("Administrador");
        var (data, code, status, detail) =
            await _cuarta.ObtenerResultadosParaUsuarioAsync(id, usuarioId, esAdmin, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(data);
    }

    [HttpPost]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(EncuestaDetalleDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Crear([FromBody] EncuestaCrearRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var validation = await _crearValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(new ValidationProblemDetails(
                validation.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())));
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await _cuarta.CrearAsync(request, adminId, correo, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return Created($"/ENC/Encuestas/{data.EncuestaId}", data);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Actualizar(int id, [FromBody] EncuestaActualizarRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var validation = await _actualizarValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(new ValidationProblemDetails(
                validation.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())));
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await _cuarta.ActualizarAsync(id, request, adminId, correo, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await _cuarta.EliminarAsync(id, adminId, correo, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpPost("{encuestaId:int}/preguntas")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> CrearPregunta(
        int encuestaId,
        [FromBody] PreguntaCrearRequest request,
        CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var validation = await _preguntaCrearValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(new ValidationProblemDetails(
                validation.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())));
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (preguntaId, code, status, detail) = await _cuarta.CrearPreguntaAsync(encuestaId, request, adminId, correo, ct);
        if (preguntaId is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return Created($"/ENC/Encuestas/preguntas/{preguntaId}", new { preguntaId });
    }

    [HttpPut("preguntas/{preguntaId:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ActualizarPregunta(
        int preguntaId,
        [FromBody] PreguntaActualizarRequest request,
        CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var validation = await _preguntaActualizarValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(new ValidationProblemDetails(
                validation.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())));
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await _cuarta.ActualizarPreguntaAsync(preguntaId, request, adminId, correo, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpDelete("preguntas/{preguntaId:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> EliminarPregunta(int preguntaId, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await _cuarta.EliminarPreguntaAsync(preguntaId, adminId, correo, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpPost("preguntas/{preguntaId:int}/opciones")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> CrearOpcion(
        int preguntaId,
        [FromBody] OpcionCrearRequest request,
        CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        if (string.IsNullOrWhiteSpace(request.Texto))
        {
            return ValidationProblem(new ValidationProblemDetails(new Dictionary<string, string[]>
            {
                ["Texto"] = new[] { "Texto requerido" },
            }));
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (opcionId, code, status, detail) = await _cuarta.CrearOpcionAsync(preguntaId, request, adminId, correo, ct);
        if (opcionId is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return Created($"/ENC/Encuestas/opciones/{opcionId}", new { opcionPreguntaId = opcionId });
    }

    [HttpPut("opciones/{opcionId:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> ActualizarOpcion(
        int opcionId,
        [FromBody] OpcionActualizarRequest request,
        CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var validation = await _opcionActualizarValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(new ValidationProblemDetails(
                validation.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())));
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await _cuarta.ActualizarOpcionAsync(opcionId, request, adminId, correo, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpDelete("opciones/{opcionId:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> EliminarOpcion(int opcionId, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await _cuarta.EliminarOpcionAsync(opcionId, adminId, correo, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpPut("{id:int}/publicar")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Publicar(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await _cuarta.PublicarAsync(id, adminId, correo, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpPost("{id:int}/respuestas")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> RegistrarRespuestas(
        int id,
        [FromBody] EncuestaResponderRequest request,
        CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
        {
            return Unauthorized();
        }

        var validation = await _responderValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return ValidationProblem(new ValidationProblemDetails(
                validation.Errors.GroupBy(e => e.PropertyName)
                    .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())));
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "usuario";
        var (ok, code, status, detail) = await _cuarta.RegistrarRespuestasAsync(id, usuarioId, correo, request, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpGet("legacy")]
    public async Task<ActionResult<IEnumerable<clReadEncuestas>>> GetAllLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? encuestaID,
        [FromQuery] string? titulo,
        [FromQuery] string? descripcion,
        [FromQuery] DateTime? fechaInicio,
        [FromQuery] DateTime? fechaFin,
        [FromQuery] bool? bActivo,
        [FromQuery] bool? bEliminado,
        [FromQuery] string? columnNames)
    {
        var vList = await _legacy.GetEncuestasDynamic(
            encuestaID, titulo, descripcion, fechaInicio, fechaFin, bActivo, bEliminado, columnNames, nUserId, sWindowName);
        return vList.Count() == 0 ? NotFound() : Ok(vList);
    }

    [HttpPost("legacy")]
    public async Task<ActionResult<clReadEncuestas>> CreateLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreateEncuestas objInput)
    {
        var vCreated = await _legacy.CreateEncuestas(objInput, nUserId, sWindowName);
        return vCreated is null ? NoContent() : vCreated;
    }

    [HttpPatch("legacy")]
    public async Task<ActionResult<clReadEncuestas>> PatchLegacy(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdateEncuestas objInput)
    {
        var vUpdated = await _legacy.UpdateEncuestas(objInput, nUserId, sWindowName);
        return vUpdated is null ? NotFound() : Ok(vUpdated);
    }

    [HttpDelete("legacy/{nEncuestasID:int}")]
    public async Task<IActionResult> DeleteLegacy(int nEncuestasID)
    {
        var success = await _legacy.DeleteEncuestas(nEncuestasID);
        return success ? NoContent() : NotFound();
    }
}
