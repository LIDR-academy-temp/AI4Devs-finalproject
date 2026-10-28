using HotChocolate.Authorization;
using GraphApi.Models.VTS.AreasComunes;
using GraphApi.Services.VTS.AreasComunes;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.AreasComunes
{
    [QueryType]
    [GraphQLDescription("Punto de entrada para las consultas de AreasComunes.")]
    public class AreasComunesQuery
    {
        /// <summary>
        /// Devuelve areascomunes con paginación, filtrado y ordenamiento.
        /// </summary>
        [UsePaging, UseFiltering, UseSorting, Authorize]
        [GraphQLName("getAreasComunes")]
        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de AreasComunes.")]
        public Task<IEnumerable<clReadAreasComunes>> GetAreasComunesAsync(
            [Service] IGraphQLContextService objCtx,
            [Service] IAreasComunesService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetAreasComunes(userId, windowName);
        }
    }
}
