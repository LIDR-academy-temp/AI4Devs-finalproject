using HotChocolate.Authorization;
using GraphApi.Models.VTS.ReservacionesEstados;
using GraphApi.Services.VTS.ReservacionesEstados;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.ReservacionesEstados
{
    [QueryType]
    [GraphQLDescription("Punto de entrada para las consultas de ReservacionesEstados.")]
    public class ReservacionesEstadosQuery
    {
        /// <summary>
        /// Devuelve reservacionesestados con paginación, filtrado y ordenamiento.
        /// </summary>
        [UsePaging, UseFiltering, UseSorting, Authorize]
        [GraphQLName("getReservacionesEstados")]
        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de ReservacionesEstados.")]
        public Task<IEnumerable<clReadReservacionesEstados>> GetReservacionesEstadosAsync(
            [Service] IGraphQLContextService objCtx,
            [Service] IReservacionesEstadosService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetReservacionesEstados(userId, windowName);
        }
    }
}
