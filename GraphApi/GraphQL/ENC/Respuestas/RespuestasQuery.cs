using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.ENC.Respuestas;using GraphApi.Services.ENC.Respuestas;using HotChocolate;namespace GraphApi.GraphQL.ENC.Respuestas{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Respuestas.")]    public class RespuestasQuery    {        /// <summary>        /// Devuelve respuestas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getRespuestas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Respuestas.")]        public Task<IEnumerable<clReadRespuestas>> GetRespuestasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IRespuestasService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetRespuestas(userId, windowName);
        }    }}