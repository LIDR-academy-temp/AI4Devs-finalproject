using System.Security.Claims;
using GraphApi.Models.WMS.CuartaAlmacen;
using GraphApi.Services.WMS.CuartaAlmacen;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.WMS.Prestamos;

/// <summary>
/// Gestión de préstamos y devoluciones del almacén (Cuarta).
/// </summary>
[ApiController]
[Authorize(Policy = "SoloAdministrador")]
[Route("WMS/[controller]")]
[Produces("application/json")]
public class PrestamosController(ICuartaAlmacenService cuarta) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string UserEmail => User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>Listar todos los préstamos.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<PrestamoListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar()
    {
        var items = await cuarta.ListarPrestamosAsync();
        return Ok(items);
    }

    /// <summary>Obtener detalle de un préstamo.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(PrestamoListItemDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Obtener(int id)
    {
        var item = await cuarta.ObtenerPrestamoAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>Registrar préstamo de un artículo (baja stock).</summary>
    [HttpPost]
    [ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status409Conflict)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Prestar([FromBody] PrestamoCrearRequest req)
    {
        var (code, id, error) = await cuarta.PrestarAsync(req, UserEmail, UserId);
        return code switch
        {
            201 => CreatedAtAction(nameof(Obtener), new { id }, new { prestamoId = id }),
            404 => NotFound(new { code = "NOT_FOUND", detail = error }),
            409 => Conflict(new { code = "STOCK_INSUFICIENTE", detail = error }),
            422 => UnprocessableEntity(new { code = "VALIDACION", detail = error }),
            _ => StatusCode(code)
        };
    }

    /// <summary>Registrar devolución de un préstamo (restablece stock).</summary>
    [HttpPatch("{id:int}/devolver")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Devolver(int id)
    {
        var (code, error) = await cuarta.DevolverAsync(id, UserEmail, UserId);
        return code switch
        {
            204 => NoContent(),
            404 => NotFound(new { code = "NOT_FOUND", detail = error }),
            _ => StatusCode(code)
        };
    }
}
