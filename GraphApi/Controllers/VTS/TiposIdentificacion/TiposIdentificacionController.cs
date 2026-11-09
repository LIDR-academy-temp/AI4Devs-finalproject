using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.VTS.CuartaVisitas;
using GraphApi.Services.VTS.CuartaVisitas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.VTS.TiposIdentificacion;

/// <summary>Catálogo Cuarta de tipos de identificación para visitas (SPA).</summary>
[ApiController]
[Authorize]
[Route("VTS/[controller]")]
[Produces("application/json")]
public class TiposIdentificacionController(ICuartaVisitasService cuarta) : ControllerBase
{
    private int UserId => JwtUserContext.TryGetUsuarioId(User, out var uid) ? uid : 0;
    private string UserEmail => JwtUserContext.GetCorreo(User) ?? "sistema";

    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<TipoIdentificacionDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar(CancellationToken ct)
        => Ok(await cuarta.ListarTiposIdentificacionAsync(ct));

    [HttpPost]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(TipoIdentificacionDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Crear([FromBody] TipoIdentificacionUpsertRequest body, CancellationToken ct)
    {
        var (data, code, status, detail) = await cuarta.CrearTipoIdentificacionAsync(body.TipoIdentificacion, UserEmail, UserId, ct);
        if (data is null) return StatusCode(status, new { code, detail });
        return StatusCode(201, data);
    }

    [HttpPut("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(TipoIdentificacionDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Actualizar(int id, [FromBody] TipoIdentificacionUpsertRequest body, CancellationToken ct)
    {
        var (data, code, status, detail) = await cuarta.ActualizarTipoIdentificacionAsync(id, body.TipoIdentificacion, UserEmail, UserId, ct);
        if (data is null) return StatusCode(status, new { code, detail });
        return Ok(data);
    }

    [HttpDelete("{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Eliminar(int id, CancellationToken ct)
    {
        var (ok, code, status, detail) = await cuarta.EliminarTipoIdentificacionAsync(id, UserEmail, UserId, ct);
        if (!ok) return StatusCode(status, new { code, detail });
        return NoContent();
    }
}
