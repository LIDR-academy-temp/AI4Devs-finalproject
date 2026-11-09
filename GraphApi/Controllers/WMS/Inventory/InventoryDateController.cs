using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;
using GraphApi.Models.WMS.Inventory;
using GraphApi.Services.WMS.Inventory;

namespace GraphApi.Controllers.WMS.Inventory
{
    /// <summary>
    /// Gestión de Reporte de Inventio a la fecha
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("WMS/[controller]")]
    [Produces("application/json")]
    [SwaggerTag("Operaciones sobre Reporte de Inventario a la fecha")]
    public class InventoryDateController : Controller
    {

        private readonly IInventoryDateService _objService;

        public InventoryDateController(IInventoryDateService objService)
        {
            _objService = objService;
        }


        /// <summary>
        /// Reporte de Inventario a la fecha
        /// </summary>
        /// <param name="userId">Id de usuario (header “UserID”).</param>
        /// <param name="windowName">Nombre de la aplicación (header “WindowName”).</param>
        /// <param name="input">Datos del tipo de defecto a crear.</param>
        /// <returns>El DefectType recién creado.</returns>
        [HttpPost]
        [SwaggerOperation(
            Summary = " Reporte de Inventario a la fecha",
            Description = " Reporte de Inventario a la fecha."
        )]
        [ProducesResponseType(typeof(clReadInventoryDate), StatusCodes.Status201Created)]
        public async Task<ActionResult<IEnumerable<clReadInventoryDate>>> GetInventoryDate(
            [FromHeader(Name = "UserID")] int nUserId,
            [FromHeader(Name = "WindowName")] string sWindowName,
            [FromBody] clFilterInventoryDate objInput)
        {
            var vList = await _objService.GetInventoryDate(objInput, nUserId, sWindowName);
            return vList.Count() == 0 ? NotFound() : Ok(vList);
        }

    }


  }
