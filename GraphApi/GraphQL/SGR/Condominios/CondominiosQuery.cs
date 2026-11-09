using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.SGR.Condominios;using GraphApi.Services.SGR.Condominios;using HotChocolate;namespace GraphApi.GraphQL.SGR.Condominios{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Condominios.")]    public class CondominiosQuery    {        /// <summary>        /// Devuelve condominios con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getCondominios")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Condominios.")]        public Task<IEnumerable<clReadCondominios>> GetCondominiosAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ICondominiosService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetCondominios(userId, windowName);
        }    }}