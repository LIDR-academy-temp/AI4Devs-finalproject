using GraphApi.Infrastructure.Security;
using GraphApi.Models.FNZ;
using GraphApi.Services.FNZ;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.FNZ.Cuentas;

[ApiController]
[Authorize(Policy = "SoloAdministrador")]
[Route("FNZ/TiposMovimiento/admin")]
[Produces("application/json")]
public class TiposMovimientoAdminController(IFinanzasService finanzas) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TipoMovimientoFnzDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken ct)
    {
        var list = await finanzas.ListarTiposMovimientoAdminAsync(ct);
        return Ok(list);
    }

    [HttpPost]
    [ProducesResponseType(typeof(TipoMovimientoFnzDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Crear([FromBody] TipoMovimientoFnzUpsertRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var userId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await finanzas.CrearTipoMovimientoAdminAsync(request, correo, userId, ct);
        if (data is null)
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        return StatusCode(status, data);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(TipoMovimientoFnzDto), StatusCodes.Status200OK)]
    public async Task<IActionResult> Actualizar(int id, [FromBody] TipoMovimientoFnzUpsertRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var userId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await finanzas.ActualizarTipoMovimientoAdminAsync(id, request, correo, userId, ct);
        if (data is null)
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        return Ok(data);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var userId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await finanzas.EliminarTipoMovimientoAdminAsync(id, correo, userId, ct);
        if (!ok)
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        return NoContent();
    }
}
