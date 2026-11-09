using FluentValidation;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.TKT;
using GraphApi.Models.TKT.Validators;
using GraphApi.Repositories.TKT;
using GraphApi.Services.TKT;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.TKT;

[ApiController]
[Authorize]
[Route("TKT/[controller]")]
[Produces("application/json")]
public class PrioridadesTicketController : ControllerBase
{
    private readonly ITicketCatalogoRepository _catalogos;
    private readonly ICuartaTicketCatalogoAdminService _admin;
    private readonly IValidator<UpsertPrioridadTicketInput> _upsertValidator;

    public PrioridadesTicketController(
        ITicketCatalogoRepository catalogos,
        ICuartaTicketCatalogoAdminService admin,
        IValidator<UpsertPrioridadTicketInput> upsertValidator)
    {
        _catalogos = catalogos;
        _admin = admin;
        _upsertValidator = upsertValidator;
    }

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<PrioridadCatalogoItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await _catalogos.ListarPrioridadesAsync(ct));

    [HttpPost("admin")]
    [Authorize(Policy = "SoloAdministrador")]
    public async Task<IActionResult> CreateAdmin([FromBody] UpsertPrioridadTicketInput input, CancellationToken ct)
    {
        var validation = await _upsertValidator.ValidateAsync(input, ct);
        if (!validation.IsValid)
        {
            return Problem(
                detail: string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)),
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await _admin.CrearPrioridadAsync(input, adminId, correo, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return StatusCode(status, data);
    }

    [HttpPut("{id:int}/admin")]
    [Authorize(Policy = "SoloAdministrador")]
    public async Task<IActionResult> UpdateAdmin(int id, [FromBody] UpsertPrioridadTicketInput input, CancellationToken ct)
    {
        var validation = await _upsertValidator.ValidateAsync(input, ct);
        if (!validation.IsValid)
        {
            return Problem(
                detail: string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)),
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await _admin.ActualizarPrioridadAsync(id, input, adminId, correo, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(data);
    }

    [HttpDelete("{id:int}/admin")]
    [Authorize(Policy = "SoloAdministrador")]
    public async Task<IActionResult> DeleteAdmin(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await _admin.EliminarPrioridadAsync(id, adminId, correo, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }
}
