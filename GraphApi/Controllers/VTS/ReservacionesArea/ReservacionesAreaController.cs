using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using GraphApi.Models.VTS.CuartaVisitas;
using GraphApi.Services.VTS.CuartaVisitas;
using GraphApi.Services.VTS.ReservacionesArea;
using Swashbuckle.AspNetCore.Annotations;
using System.Security.Claims;

namespace GraphApi.Controllers.VTS.ReservacionesArea;

[ApiController]
[Authorize]
[Route("VTS/[controller]")]
[Produces("application/json")]
[SwaggerTag("Reservaciones de áreas comunes")]
public class ReservacionesAreaController(
    ICuartaVisitasService cuarta,
    IReservacionesAreaService legacy) : ControllerBase
{
    /// <summary>Crea una reservación de área común para el residente autenticado.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(ReservacionAreaDto), 201)]
    [ProducesResponseType(409)]
    [ProducesResponseType(422)]
    public async Task<IActionResult> Crear([FromBody] CrearReservacionRequest request, CancellationToken ct)
    {
        var correo = User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue("correo") ?? "";
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        var (reservacion, code, status, detail) = await cuarta.CrearReservacionAsync(request, correo, userId, ct);
        if (reservacion is null) return Problem(detail: detail, statusCode: status, title: code);
        return StatusCode(201, reservacion);
    }

    /// <summary>Lista las reservaciones del residente autenticado.</summary>
    [HttpGet("mias")]
    [ProducesResponseType(typeof(IReadOnlyList<ReservacionAreaDto>), 200)]
    public async Task<IActionResult> Mias(CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        var list = await cuarta.ListarReservacionesMiasAsync(userId, ct);
        return Ok(list);
    }

    // Legacy
    [HttpGet("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyGet(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] string? columnNames)
    {
        var list = await legacy.GetReservacionesAreasDynamic(
            null, null, null, null, null, null, null, null, null, null, null, null, null,
            columnNames, nUserId, sWindowName);
        return list.Any() ? Ok(list) : NotFound();
    }
}
