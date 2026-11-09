using GraphApi.Infrastructure.Security;
using GraphApi.Models.TKT;
using GraphApi.Models.TKT.Validators;
using GraphApi.Services.TKT;
using FluentValidation;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.TKT;

[ApiController]
[Authorize]
[Route("TKT/[controller]")]
[Produces("application/json")]
public class CategoriasTicketController : ControllerBase
{
    private readonly ICuartaTicketQueryService _query;
    private readonly ICuartaTicketCatalogoAdminService _admin;
    private readonly IValidator<UpsertCategoriaTicketInput> _upsertValidator;

    public CategoriasTicketController(
        ICuartaTicketQueryService query,
        ICuartaTicketCatalogoAdminService admin,
        IValidator<UpsertCategoriaTicketInput> upsertValidator)
    {
        _query = query;
        _admin = admin;
        _upsertValidator = upsertValidator;
    }

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await _query.ListarCategoriasAsync(ct));

    [HttpPost("admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(CatalogoItemDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> CreateAdmin([FromBody] UpsertCategoriaTicketInput input, CancellationToken ct)
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
        var (data, code, status, detail) = await _admin.CrearCategoriaAsync(input, adminId, correo, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return StatusCode(status, data);
    }

    [HttpPut("{id:int}/admin")]
    [Authorize(Policy = "SoloAdministrador")]
    public async Task<IActionResult> UpdateAdmin(int id, [FromBody] UpsertCategoriaTicketInput input, CancellationToken ct)
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
        var (data, code, status, detail) = await _admin.ActualizarCategoriaAsync(id, input, adminId, correo, ct);
        if (data is null)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return Ok(data);
    }

    [HttpDelete("{id:int}/admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> DeleteAdmin(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await _admin.EliminarCategoriaAsync(id, adminId, correo, ct);
        if (!ok)
        {
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return NoContent();
    }
}
