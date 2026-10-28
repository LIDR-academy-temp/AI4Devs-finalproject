using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;
using GraphApi.Models.SGR.PerfilMenus;
using GraphApi.Services.SGR.PerfilMenus;
using HotChocolate;

namespace GraphApi.GraphQL.SGR.PerfilMenus
{
    [QueryType]
    [GraphQLDescription("Punto de entrada para las consultas de PerfilMenus.")]
    public class PerfilMenusQuery
    {
        /// <summary>
        /// Devuelve perfilmenus con paginación, filtrado y ordenamiento.
        /// </summary>
        [UsePaging, UseFiltering, UseSorting, Authorize]
        [GraphQLName("getPerfilMenus")]
        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de PerfilMenus.")]
        public Task<IEnumerable<clReadPerfilMenus>> GetPerfilMenusAsync(
            [Service] IGraphQLContextService objCtx,
            [Service] IPerfilMenusService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetPerfilMenus(userId, windowName);
        }
    }
}
