using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.USR.Marcas;using GraphApi.Services.USR.Marcas;using HotChocolate;namespace GraphApi.GraphQL.USR.Marcas{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Marcas.")]    public class MarcasQuery    {        /// <summary>        /// Devuelve marcas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getMarcas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Marcas.")]        public Task<IEnumerable<clReadMarcas>> GetMarcasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IMarcasService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetMarcas(userId, windowName);
        }    }}