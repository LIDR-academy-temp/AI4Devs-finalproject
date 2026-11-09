using HotChocolate.Authorization;
using GraphApi.Models.VTS.LogUsoVisitas;
using GraphApi.Services.VTS.LogUsoVisitas;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.LogUsoVisitas
{
    [QueryType]
    [GraphQLDescription("Punto de entrada para las consultas de LogUsoVisitas.")]
    public class LogUsoVisitasQuery
    {
        /// <summary>
        /// Devuelve logusovisitas con paginación, filtrado y ordenamiento.
        /// </summary>
        [UsePaging, UseFiltering, UseSorting, Authorize]
        [GraphQLName("getLogUsoVisitas")]
        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de LogUsoVisitas.")]
        public Task<IEnumerable<clReadLogUsoVisitas>> GetLogUsoVisitasAsync(
            [Service] IGraphQLContextService objCtx,
            [Service] ILogUsoVisitasService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetLogUsoVisitas(userId, windowName);
        }
    }
}
