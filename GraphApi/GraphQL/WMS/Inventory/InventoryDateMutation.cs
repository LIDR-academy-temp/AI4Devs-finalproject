using GraphApi.Models.WMS.Inventory;
using GraphApi.Services.WMS.Inventory;
using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;
namespace GraphApi.GraphQL.WMS.Inventory
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de Reporte de inventario a la fecha")]
    public class InventoryDateMutation
    {
        [Authorize]
        [GraphQLName("getInventoryDate")]
        [GraphQLDescription("Obtienes el reporte de inventario a la fecha.")]
        public Task<IEnumerable<clReadInventoryDate>> getInventoryDate(
            [GraphQLDescription("Datos necesarios para los filtros.")]
            clFilterInventoryDate objInput,
            [Service]
            [GraphQLDescription("Servicio para operaciones de tipo de defecto.")]
            IInventoryDateService objService,
            [Service] IGraphQLContextService objCtx)
        {
            // Obtener HttpContext
            var (userId, windowName) = objCtx.GetRequestContext();

            // Llamada al servicio usando los valores del header
            return objService.GetInventoryDate (objInput, userId, windowName);
        }
    }
}
