using GraphApi.Infrastructure.Security;
using GraphApi.Models.FNZ;
using GraphApi.Services.FNZ;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.FNZ.Cuentas;

[ApiController]
[Authorize(Policy = "SoloAdministrador")]
[Route("FNZ/Cuentas/admin")]
[Produces("application/json")]
public class CuentasAdminController(IFinanzasService finanzas) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<CuentaFnzAdminDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken ct)
    {
        var list = await finanzas.ListarCuentasAdminAsync(ct);
        return Ok(list);
    }

    [HttpPost]
    [ProducesResponseType(typeof(CuentaFnzAdminDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status400BadRequest)]
    public async Task<IActionResult> Crear([FromBody] CuentaFnzUpsertRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var userId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await finanzas.CrearCuentaAdminAsync(request, correo, userId, ct);
        if (data is null)
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        return StatusCode(status, data);
    }

    [HttpPut("{id:int}")]
    [ProducesResponseType(typeof(CuentaFnzAdminDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Actualizar(int id, [FromBody] CuentaFnzUpsertRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var userId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) = await finanzas.ActualizarCuentaAdminAsync(id, request, correo, userId, ct);
        if (data is null)
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        return Ok(data);
    }

    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var userId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await finanzas.EliminarCuentaAdminAsync(id, correo, userId, ct);
        if (!ok)
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        return NoContent();
    }
}
