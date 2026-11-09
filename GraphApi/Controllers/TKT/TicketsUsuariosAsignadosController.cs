using GraphApi.Infrastructure.Security;
using GraphApi.Models.TKT;
using GraphApi.Services.TKT;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.TKT;

[ApiController]
[Authorize(Policy = "SoloAdministrador")]
[Route("TKT/[controller]")]
[Produces("application/json")]
public class TicketsUsuariosAsignadosController : ControllerBase
{
    private readonly ICuartaTicketAdminService _admin;

    public TicketsUsuariosAsignadosController(ICuartaTicketAdminService admin) => _admin = admin;

    [HttpPost]
    [ProducesResponseType(StatusCodes.Status201Created)]
    public async Task<IActionResult> Asignar([FromBody] AsignarTicketRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, asignacionId, code, status, detail) =
            await _admin.AsignarAsync(request, adminId, correo, ct);

        if (!ok)
        {
            return Problem(
                detail: detail ?? "No se pudo asignar",
                statusCode: status,
                title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        return Created($"/TKT/TicketsUsuariosAsignados/{asignacionId}", new { id = asignacionId });
    }
}
