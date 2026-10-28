using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.ENC.Encuestas;using GraphApi.Services.ENC.Encuestas;using HotChocolate;namespace GraphApi.GraphQL.ENC.Encuestas{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Encuestas.")]    public class EncuestasQuery    {        /// <summary>        /// Devuelve encuestas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getEncuestas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Encuestas.")]        public Task<IEnumerable<clReadEncuestas>> GetEncuestasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IEncuestasService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetEncuestas(userId, windowName);
        }    }}