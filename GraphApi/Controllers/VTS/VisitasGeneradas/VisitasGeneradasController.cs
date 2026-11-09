using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.VTS.CuartaVisitasGeneradas;
using GraphApi.Models.VTS.VisitasGeneradas;
using GraphApi.Services.VTS.CuartaVisitasGeneradas;
using GraphApi.Services.VTS.VisitasGeneradas;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.VTS.VisitasGeneradas;

/// <summary>Gestión de pases QR (Cuarta JWT) y operaciones legacy.</summary>
[ApiController]
[Authorize]
[Route("VTS/[controller]")]
[Produces("application/json")]
[SwaggerTag("Pases de visita (QR) y VisitasGeneradas legacy")]
public class VisitasGeneradasController(
    ICuartaVisitasGeneradasService cuarta,
    IVisitasGeneradasService legacy) : ControllerBase
{
    // ── Cuarta (JWT) ─────────────────────────────────────────────────────────

    /// <summary>Lista los pases del residente autenticado.</summary>
    [HttpGet("mias")]
    [ProducesResponseType(typeof(IReadOnlyList<PaseVisitaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarMias(CancellationToken ct)
    {
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");
        var list = await cuarta.ListMiasAsync(userId, ct);
        return Ok(list);
    }

    /// <summary>Crea un pase con código QR único.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(PaseVisitaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> CrearPase([FromBody] CrearPaseRequest request, CancellationToken ct)
    {
        var correo = JwtUserContext.GetCorreo(User) ?? "";
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        var (pase, code, status, detail) = await cuarta.CrearPaseAsync(request, userId, correo, ct);
        if (pase is null) return Problem(detail: detail, statusCode: status, title: code);
        return StatusCode(StatusCodes.Status201Created, pase);
    }

    /// <summary>Admin crea pase QR a nombre de un residente visitado.</summary>
    [HttpPost("admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(PaseVisitaDto), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> CrearPaseAdmin([FromBody] CrearPaseAdminRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
        {
            return Unauthorized();
        }

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (pase, code, status, detail) = await cuarta.CrearPaseAdminAsync(request, adminId, correo, ct);
        if (pase is null) return Problem(detail: detail, statusCode: status, title: code);
        return StatusCode(StatusCodes.Status201Created, pase);
    }

    /// <summary>Listado de pases QR (admin).</summary>
    [HttpGet("admin")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(IReadOnlyList<PaseVisitaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarAdmin(
        [FromQuery] int? casaId,
        [FromQuery] DateTime? desde,
        [FromQuery] DateTime? hasta,
        CancellationToken ct)
    {
        var list = await cuarta.ListAdminAsync(casaId, desde, hasta, ct);
        return Ok(list);
    }

    /// <summary>Admin actualiza un pase vigente (no usado / no expirado).</summary>
    [HttpPut("admin/{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(typeof(PaseVisitaDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> ActualizarPaseAdmin(int id, [FromBody] CrearPaseAdminRequest request, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            return Unauthorized();

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (pase, code, status, detail) = await cuarta.ActualizarPaseAdminAsync(id, request, adminId, correo, ct);
        if (pase is null) return Problem(detail: detail, statusCode: status, title: code);
        return Ok(pase);
    }

    /// <summary>Admin cancela (soft delete) un pase QR.</summary>
    [HttpDelete("admin/{id:int}")]
    [Authorize(Policy = "SoloAdministrador")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> CancelarPaseAdmin(int id, CancellationToken ct)
    {
        if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            return Unauthorized();

        var correo = JwtUserContext.GetCorreo(User) ?? "admin";
        var (ok, code, status, detail) = await cuarta.CancelarPaseAdminAsync(id, adminId, correo, ct);
        if (!ok) return Problem(detail: detail, statusCode: status, title: code);
        return NoContent();
    }

    /// <summary>Valida un código QR (guardia o administrador).</summary>
    [HttpPost("validar")]
    [Authorize(Policy = "AdminOGuardia")]
    [ProducesResponseType(typeof(ValidarPaseResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> Validar([FromBody] ValidarPaseRequest request, CancellationToken ct)
    {
        var result = await cuarta.ValidarAsync(request.CodigoQr, ct);
        return Ok(result);
    }

    /// <summary>Marca un pase como usado (entrada registrada).</summary>
    [HttpPost("{id:int}/usar")]
    [Authorize(Policy = "AdminOGuardia")]
    [ProducesResponseType(typeof(UsarPaseResponse), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    public async Task<IActionResult> Usar(int id, CancellationToken ct)
    {
        var correo = JwtUserContext.GetCorreo(User) ?? "";
        var userId = int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier) ?? "0");

        var (response, code, status, detail) = await cuarta.UsarAsync(id, correo, userId, ct);
        if (response is null) return Problem(detail: detail, statusCode: status, title: code);
        return Ok(response);
    }

    // ── Legacy ───────────────────────────────────────────────────────────────

    [HttpGet("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<ActionResult<IEnumerable<clReadVisitasGeneradas>>> LegacyGetAll(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? visitaGeneradaID,
        [FromQuery] string? nombreVisitante,
        [FromQuery] int? usuarioVisitadoID,
        [FromQuery] string? nombreVisitado,
        [FromQuery] string? correoVisitado,
        [FromQuery] int? casaID,
        [FromQuery] string? direccionCasa,
        [FromQuery] string? numeroExtCasa,
        [FromQuery] int? tipoIdentificacionID,
        [FromQuery] string? tipoIdentificacion,
        [FromQuery] string? numeroIdentificacion,
        [FromQuery] string? rutaDocumento,
        [FromQuery] string? codigoQR,
        [FromQuery] DateTime? fechaEmision,
        [FromQuery] DateTime? fechaExpira,
        [FromQuery] bool? bUsado,
        [FromQuery] bool? bEliminado,
        [FromQuery] string? columnNames)
    {
        var vList = await legacy.GetVisitasGeneradasDynamic(
            visitaGeneradaID,
            nombreVisitante,
            usuarioVisitadoID,
            nombreVisitado,
            correoVisitado,
            casaID,
            direccionCasa,
            numeroExtCasa,
            tipoIdentificacionID,
            tipoIdentificacion,
            numeroIdentificacion,
            rutaDocumento,
            codigoQR,
            fechaEmision,
            fechaExpira,
            bUsado,
            bEliminado,
            columnNames,
            nUserId,
            sWindowName);
        return vList.Any() ? Ok(vList) : NotFound();
    }

    [HttpGet]
    [ApiExplorerSettings(IgnoreApi = true)]
    public Task<ActionResult<IEnumerable<clReadVisitasGeneradas>>> LegacyGetAllRoot(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromQuery] int? visitaGeneradaID,
        [FromQuery] string? nombreVisitante,
        [FromQuery] int? usuarioVisitadoID,
        [FromQuery] string? nombreVisitado,
        [FromQuery] string? correoVisitado,
        [FromQuery] int? casaID,
        [FromQuery] string? direccionCasa,
        [FromQuery] string? numeroExtCasa,
        [FromQuery] int? tipoIdentificacionID,
        [FromQuery] string? tipoIdentificacion,
        [FromQuery] string? numeroIdentificacion,
        [FromQuery] string? rutaDocumento,
        [FromQuery] string? codigoQR,
        [FromQuery] DateTime? fechaEmision,
        [FromQuery] DateTime? fechaExpira,
        [FromQuery] bool? bUsado,
        [FromQuery] bool? bEliminado,
        [FromQuery] string? columnNames)
        => LegacyGetAll(
            nUserId, sWindowName, visitaGeneradaID, nombreVisitante, usuarioVisitadoID, nombreVisitado,
            correoVisitado, casaID, direccionCasa, numeroExtCasa, tipoIdentificacionID, tipoIdentificacion,
            numeroIdentificacion, rutaDocumento, codigoQR, fechaEmision, fechaExpira, bUsado, bEliminado,
            columnNames);

    [HttpPost("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<ActionResult<clReadVisitasGeneradas>> LegacyCreate(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clCreateVisitasGeneradas objInput)
    {
        var vCreated = await legacy.CreateVisitasGeneradas(objInput, nUserId, sWindowName);
        return vCreated is null ? NoContent() : Ok(vCreated);
    }

    [HttpPatch("legacy")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<ActionResult<clReadVisitasGeneradas>> LegacyPatch(
        [FromHeader(Name = "UserID")] int nUserId,
        [FromHeader(Name = "WindowName")] string sWindowName,
        [FromBody] clUpdateVisitasGeneradas objInput)
    {
        var vUpdated = await legacy.UpdateVisitasGeneradas(objInput, nUserId, sWindowName);
        return vUpdated is null ? NotFound() : Ok(vUpdated);
    }

    [HttpDelete("legacy/{nVisitasGeneradasID:int}")]
    [ApiExplorerSettings(IgnoreApi = true)]
    public async Task<IActionResult> LegacyDelete(int nVisitasGeneradasID)
    {
        var success = await legacy.DeleteVisitasGeneradas(nVisitasGeneradasID);
        return success ? NoContent() : NotFound();
    }
}
