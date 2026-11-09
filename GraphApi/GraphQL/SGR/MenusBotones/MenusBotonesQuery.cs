using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.SGR.MenusBotones;using GraphApi.Services.SGR.MenusBotones;using HotChocolate;namespace GraphApi.GraphQL.SGR.MenusBotones{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de MenusBotones.")]    public class MenusBotonesQuery    {        /// <summary>        /// Devuelve menusbotones con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getMenusBotones")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de MenusBotones.")]        public Task<IEnumerable<clReadMenusBotones>> GetMenusBotonesAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IMenusBotonesService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetMenusBotones(userId, windowName);
        }    }}