using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.ANM.Anuncios;using GraphApi.Services.ANM.Anuncios;using HotChocolate;namespace GraphApi.GraphQL.ANM.Anuncios{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Anuncios.")]    public class AnunciosQuery    {        /// <summary>        /// Devuelve anuncios con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getAnuncios")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Anuncios.")]        public Task<IEnumerable<clReadAnuncios>> GetAnunciosAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IAnunciosService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetAnuncios(userId, windowName);
        }    }}