using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.ANM.TiposAnuncio;using GraphApi.Services.ANM.TiposAnuncio;using HotChocolate;namespace GraphApi.GraphQL.ANM.TiposAnuncio{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de TiposAnuncios.")]    public class TiposAnuncioQuery    {        /// <summary>        /// Devuelve tiposanuncios con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getTiposAnuncios")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de TiposAnuncios.")]        public Task<IEnumerable<clReadTiposAnuncio>> GetTiposAnunciosAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ITiposAnuncioService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetTiposAnuncios(userId, windowName);
        }    }}