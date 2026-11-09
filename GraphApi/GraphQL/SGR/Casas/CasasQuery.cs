using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.SGR.Casas;using GraphApi.Services.SGR.Casas;using HotChocolate;namespace GraphApi.GraphQL.SGR.Casas{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Casas.")]    public class CasasQuery    {        /// <summary>        /// Devuelve casas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getCasas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Casas.")]        public Task<IEnumerable<clReadCasas>> GetCasasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ICasasService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetCasas(userId, windowName);
        }    }}