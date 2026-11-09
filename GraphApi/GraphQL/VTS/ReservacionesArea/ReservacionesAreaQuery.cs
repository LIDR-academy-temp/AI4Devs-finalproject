using HotChocolate.Authorization;
using GraphApi.Models.VTS.ReservacionesArea;
using GraphApi.Services.VTS.ReservacionesArea;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.ReservacionesArea
{
    [QueryType]
    [GraphQLDescription("Punto de entrada para las consultas de ReservacionesAreas.")]
    public class ReservacionesAreaQuery
    {
        /// <summary>
        /// Devuelve reservacionesareas con paginación, filtrado y ordenamiento.
        /// </summary>
        [UsePaging, UseFiltering, UseSorting, Authorize]
        [GraphQLName("getReservacionesAreas")]
        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de ReservacionesAreas.")]
        public Task<IEnumerable<clReadReservacionesArea>> GetReservacionesAreasAsync(
            [Service] IGraphQLContextService objCtx,
            [Service] IReservacionesAreaService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetReservacionesAreas(userId, windowName);
        }
    }
}
