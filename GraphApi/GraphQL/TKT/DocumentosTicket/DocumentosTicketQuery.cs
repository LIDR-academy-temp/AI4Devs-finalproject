using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.TKT.DocumentosTicket;using GraphApi.Services.TKT.DocumentosTicket;using HotChocolate;namespace GraphApi.GraphQL.TKT.DocumentosTicket{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de DocumentosTickets.")]    public class DocumentosTicketQuery    {        /// <summary>        /// Devuelve documentostickets con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getDocumentosTickets")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de DocumentosTickets.")]        public Task<IEnumerable<clReadDocumentosTicket>> GetDocumentosTicketsAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IDocumentosTicketService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetDocumentosTickets(userId, windowName);
        }    }}