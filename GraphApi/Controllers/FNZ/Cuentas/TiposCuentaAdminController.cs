using GraphApi.Infrastructure.Security;
using GraphApi.Models.FNZ;
using GraphApi.Services.FNZ;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.FNZ.Cuentas;

[ApiController]
[Authorize(Policy = "SoloAdministrador")]
[Route("FNZ/TiposCuenta/admin")]
[Produces("application/json")]
public class TiposCuentaAdminController(IFinanzasService finanzas) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TipoCuentaFnzDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken ct)
    {
        var list = await finanzas.ListarTiposCuentaAdminAsync(ct);
        return Ok(list);
    }

    [HttpPost]
    [ProducesResponseType(typeof(TipoCuentaFnzDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    [ProducesResponseType(StatusCodes.Status503ServiceUnavailable)]
    public async Task<IActionResult> Crear([FromBody] TipoCuentaFnzUpsertRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var userId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await finanzas.CrearTipoCuentaAdminAsync(request, correo, userId, ct);
        if (data is null)
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        return StatusCode(status, data);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(TipoCuentaFnzDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Actualizar(int id, [FromBody] TipoCuentaFnzUpsertRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var userId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await finanzas.ActualizarTipoCuentaAdminAsync(id, request, correo, userId, ct);
        if (data is null)
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        return Ok(data);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var userId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await finanzas.EliminarTipoCuentaAdminAsync(id, correo, userId, ct);
        if (!ok)
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        return NoContent();
    }
}
