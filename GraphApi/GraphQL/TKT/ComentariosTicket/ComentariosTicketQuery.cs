using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.TKT.ComentariosTicket;using GraphApi.Services.TKT.ComentariosTicket;using HotChocolate;namespace GraphApi.GraphQL.TKT.ComentariosTicket{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de ComentariosTickets.")]    public class ComentariosTicketQuery    {        /// <summary>        /// Devuelve comentariostickets con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getComentariosTickets")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de ComentariosTickets.")]        public Task<IEnumerable<clReadComentariosTicket>> GetComentariosTicketsAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IComentariosTicketService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetComentariosTickets(userId, windowName);
        }    }}