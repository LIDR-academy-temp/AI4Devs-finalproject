using GraphApi.Infrastructure.Security;
using GraphApi.Models.FNZ;
using GraphApi.Services.FNZ;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.FNZ.Cuentas;

[ApiController]
[Authorize(Policy = "SoloAdministrador")]
[Route("FNZ/Transacciones/admin")]
[Produces("application/json")]
public class TransaccionesAdminController(IFinanzasService finanzas) : ControllerBase
{
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<MovimientoFnzDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken ct)
    {
        var list = await finanzas.ListarMovimientosAdminAsync(ct);
        return Ok(list);
    }

    [HttpPost]
    [ProducesResponseType(typeof(MovimientoFnzDto), StatusCodes.Status201Created)]
    public async Task<IActionResult> Registrar([FromBody] RegistrarMovimientoFnzRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var userId))
            return Unauthorized();
        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (data, code, status, detail) =
            await finanzas.RegistrarMovimientoAdminAsync(request, userId, correo, ct);
        if (data is null)
            return Problem(detail: detail, statusCode: status, title: code,
                extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
        return StatusCode(status, data);
    }
}
