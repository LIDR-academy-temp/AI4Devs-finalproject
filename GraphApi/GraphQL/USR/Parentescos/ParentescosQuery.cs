using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.USR.Parentescos;using GraphApi.Services.USR.Parentescos;using HotChocolate;namespace GraphApi.GraphQL.USR.Parentescos{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Parentescos.")]    public class ParentescosQuery    {        /// <summary>        /// Devuelve parentescos con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getParentescos")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Parentescos.")]        public Task<IEnumerable<clReadParentescos>> GetParentescosAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IParentescosService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetParentescos(userId, windowName);
        }    }}