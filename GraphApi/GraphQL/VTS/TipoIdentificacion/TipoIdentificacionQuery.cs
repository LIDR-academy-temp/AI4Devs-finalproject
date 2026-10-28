using HotChocolate.Authorization;
using GraphApi.Models.VTS.TipoIdentificacion;
using GraphApi.Services.VTS.TipoIdentificacion;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.TipoIdentificacion
{
    [QueryType]
    [GraphQLDescription("Punto de entrada para las consultas de TipoIdentificacions.")]
    public class TipoIdentificacionQuery
    {
        /// <summary>
        /// Devuelve tipoidentificacions con paginación, filtrado y ordenamiento.
        /// </summary>
        [UsePaging, UseFiltering, UseSorting, Authorize]
        [GraphQLName("getTipoIdentificacions")]
        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de TipoIdentificacions.")]
        public Task<IEnumerable<clReadTipoIdentificacion>> GetTipoIdentificacionsAsync(
            [Service] IGraphQLContextService objCtx,
            [Service] ITipoIdentificacionService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetTipoIdentificacions(userId, windowName);
        }
    }
}
