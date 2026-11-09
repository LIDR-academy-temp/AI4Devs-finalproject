using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.TKT.Tickets;using GraphApi.Services.TKT.Tickets;using HotChocolate;namespace GraphApi.GraphQL.TKT.Tickets{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Tickets.")]    public class TicketsQuery    {        /// <summary>        /// Devuelve tickets con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getTickets")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Tickets.")]        public Task<IEnumerable<clReadTickets>> GetTicketsAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ITicketsService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetTickets(userId, windowName);
        }    }}