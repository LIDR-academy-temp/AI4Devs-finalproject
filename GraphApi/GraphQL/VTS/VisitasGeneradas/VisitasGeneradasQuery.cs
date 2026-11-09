using HotChocolate.Authorization;
using GraphApi.Models.VTS.VisitasGeneradas;
using GraphApi.Services.VTS.VisitasGeneradas;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.VisitasGeneradas
{
    [QueryType]
    [GraphQLDescription("Punto de entrada para las consultas de VisitasGeneradas.")]
    public class VisitasGeneradasQuery
    {
        /// <summary>
        /// Devuelve visitasgeneradas con paginación, filtrado y ordenamiento.
        /// </summary>
        [UsePaging, UseFiltering, UseSorting, Authorize]
        [GraphQLName("getVisitasGeneradas")]
        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de VisitasGeneradas.")]
        public Task<IEnumerable<clReadVisitasGeneradas>> GetVisitasGeneradasAsync(
            [Service] IGraphQLContextService objCtx,
            [Service] IVisitasGeneradasService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetVisitasGeneradas(userId, windowName);
        }
    }
}
