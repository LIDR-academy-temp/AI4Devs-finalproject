using FluentValidation;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.NTF;
using GraphApi.Models.NTF.Validators;
using GraphApi.Services.NTF;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.NTF;

[ApiController]
[Authorize]
[Route("NTF/[controller]")]
[Produces("application/json")]
public class NotificacionesController : ControllerBase
{
    private readonly INotificacionService _service;
    private readonly IValidator<AvisoGeneralRequest> _avisoValidator;

    public NotificacionesController(
        INotificacionService service,
        IValidator<AvisoGeneralRequest> avisoValidator)
    {
        _service = service;
        _avisoValidator = avisoValidator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(NotificacionBandejaResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GetBandeja(
        [FromQuery] int pagina = 1,
        [FromQuery] int tamano = 20,
        CancellationToken ct = default)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
        {
            return Unauthorized();
        }

        if (pagina < 1 || tamano < 1 || tamano > 100)
        {
            return Problem(
                detail: "pagina debe ser >= 1 y tamano entre 1 y 100",
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        var bandeja = await _service.GetBandejaAsync(usuarioId, pagina, tamano, ct);
        return Ok(bandeja);
    }

    [HttpPatch("{id:int}/leida")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> MarcarLeida(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "usuario";
        var (ok, code, status) = await _service.MarcarLeidaAsync(id, usuarioId, correo, ct);
        if (!ok)
        {
            return Problem(
                detail: code == "FORBIDDEN" ? "No puedes marcar esta notificación" : "Notificación no encontrada",
                statusCode: status,
                title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }

    [HttpPost("aviso")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(AvisoGeneralResponse), StatusCodes.Status201Created)]
    public async Task<IActionResult> AvisoGeneral([FromBody] AvisoGeneralRequest request, CancellationToken ct)
    {
        var validation = await _avisoValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return Problem(
                detail: string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)),
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var destinatarios = await _service.AvisoGeneralAsync(
            request.Titulo,
            request.Mensaje,
            new NotificacionAutor(usuarioId, correo),
            ct);

        return StatusCode(StatusCodes.Status201Created, new AvisoGeneralResponse { Destinatarios = destinatarios });
    }
}
