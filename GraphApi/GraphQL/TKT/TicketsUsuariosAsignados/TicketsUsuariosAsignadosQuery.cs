using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.TKT.TicketsUsuariosAsignados;using GraphApi.Services.TKT.TicketsUsuariosAsignados;using HotChocolate;namespace GraphApi.GraphQL.TKT.TicketsUsuariosAsignados{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de TicketsUsuariosAsignados.")]    public class TicketsUsuariosAsignadosQuery    {        /// <summary>        /// Devuelve ticketsusuariosasignados con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getTicketsUsuariosAsignados")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de TicketsUsuariosAsignados.")]        public Task<IEnumerable<clReadTicketsUsuariosAsignados>> GetTicketsUsuariosAsignadosAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ITicketsUsuariosAsignadosService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetTicketsUsuariosAsignados(userId, windowName);
        }    }}