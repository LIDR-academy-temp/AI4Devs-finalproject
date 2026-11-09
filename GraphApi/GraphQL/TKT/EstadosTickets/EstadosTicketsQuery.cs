using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.TKT.EstadosTickets;using GraphApi.Services.TKT.EstadosTickets;using HotChocolate;namespace GraphApi.GraphQL.TKT.EstadosTickets{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de EstadosTickets.")]    public class EstadosTicketsQuery    {        /// <summary>        /// Devuelve estadostickets con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getEstadosTickets")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de EstadosTickets.")]        public Task<IEnumerable<clReadEstadosTickets>> GetEstadosTicketsAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IEstadosTicketsService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetEstadosTickets(userId, windowName);
        }    }}