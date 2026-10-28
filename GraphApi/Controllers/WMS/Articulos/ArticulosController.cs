using System.Security.Claims;
using GraphApi.Models.WMS.CuartaAlmacen;
using GraphApi.Services.WMS.CuartaAlmacen;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.WMS.Articulos;

/// <summary>
/// Gestión del inventario de artículos del almacén (Cuarta).
/// </summary>
[ApiController]
[Authorize(Policy = "SoloAdministrador")]
[Route("WMS/[controller]")]
[Produces("application/json")]
public class ArticulosController(ICuartaAlmacenService cuarta) : ControllerBase
{
    private int UserId => int.Parse(User.FindFirstValue(ClaimTypes.NameIdentifier)!);
    private string UserEmail => User.FindFirstValue(ClaimTypes.Email) ?? User.FindFirstValue(ClaimTypes.NameIdentifier)!;

    /// <summary>Listar todos los artículos del inventario.</summary>
    [HttpGet]
    [ProducesResponseType(typeof(IReadOnlyList<ArticuloListItemDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> Listar()
    {
        var items = await cuarta.ListarArticulosAsync();
        return Ok(items);
    }

    /// <summary>Obtener detalle de un artículo.</summary>
    [HttpGet("{id:int}")]
    [ProducesResponseType(typeof(ArticuloDetalleDto), StatusCodes.Status200OK)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Obtener(int id)
    {
        var item = await cuarta.ObtenerArticuloAsync(id);
        return item is null ? NotFound() : Ok(item);
    }

    /// <summary>Listar categorías de artículo.</summary>
    [HttpGet("categorias")]
    [ProducesResponseType(typeof(IReadOnlyList<CategoriaDto>), StatusCodes.Status200OK)]
    public async Task<IActionResult> ListarCategorias()
    {
        var cats = await cuarta.ListarCategoriasAsync();
        return Ok(cats);
    }

    /// <summary>Crear un nuevo artículo en el inventario.</summary>
    [HttpPost]
    [ProducesResponseType(typeof(object), StatusCodes.Status201Created)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Crear([FromBody] ArticuloCrearRequest req)
    {
        var (code, id, error) = await cuarta.CrearArticuloAsync(req, UserEmail, UserId);
        return code switch
        {
            201 => CreatedAtAction(nameof(Obtener), new { id }, new { articuloId = id }),
            422 => UnprocessableEntity(new { code = "VALIDACION", detail = error }),
            _ => StatusCode(code)
        };
    }

    /// <summary>Actualizar datos o stock de un artículo.</summary>
    [HttpPut("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    [ProducesResponseType(StatusCodes.Status422UnprocessableEntity)]
    public async Task<IActionResult> Actualizar(int id, [FromBody] ArticuloActualizarRequest req)
    {
        var (code, error) = await cuarta.ActualizarArticuloAsync(id, req, UserEmail, UserId);
        return code switch
        {
            204 => NoContent(),
            404 => NotFound(new { code = "NOT_FOUND", detail = error }),
            422 => UnprocessableEntity(new { code = "VALIDACION", detail = error }),
            _ => StatusCode(code)
        };
    }

    /// <summary>Eliminar lógicamente un artículo.</summary>
    [HttpDelete("{id:int}")]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    [ProducesResponseType(StatusCodes.Status404NotFound)]
    public async Task<IActionResult> Eliminar(int id)
    {
        var (code, error) = await cuarta.EliminarArticuloAsync(id, UserEmail, UserId);
        return code switch
        {
            204 => NoContent(),
            404 => NotFound(new { code = "NOT_FOUND", detail = error }),
            _ => StatusCode(code)
        };
    }
}
