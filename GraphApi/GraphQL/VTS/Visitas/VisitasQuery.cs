using HotChocolate.Authorization;
using GraphApi.Models.VTS.Visitas;
using GraphApi.Services.VTS.Visitas;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.Visitas
{
    [QueryType]
    [GraphQLDescription("Punto de entrada para las consultas de Visitas.")]
    public class VisitasQuery
    {
        /// <summary>
        /// Devuelve visitas con paginación, filtrado y ordenamiento.
        /// </summary>
        [UsePaging, UseFiltering, UseSorting, Authorize]
        [GraphQLName("getVisitas")]
        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Visitas.")]
        public Task<IEnumerable<clReadVisitas>> GetVisitasAsync(
            [Service] IGraphQLContextService objCtx,
            [Service] IVisitasService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetVisitas(userId, windowName);
        }
    }
}
