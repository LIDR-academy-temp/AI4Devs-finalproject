using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.SGR.Menus;using GraphApi.Services.SGR.Menus;using HotChocolate;namespace GraphApi.GraphQL.SGR.Menus{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Menus.")]    public class MenusQuery    {        /// <summary>        /// Devuelve menus con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getMenus")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Menus.")]        public Task<IEnumerable<clReadMenus>> GetMenusAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IMenusService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetMenus(userId, windowName);
        }    }}