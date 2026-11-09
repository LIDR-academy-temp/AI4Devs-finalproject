using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.ENC.TiposPregunta;using GraphApi.Services.ENC.TiposPregunta;using HotChocolate;namespace GraphApi.GraphQL.ENC.TiposPregunta{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de TiposPreguntas.")]    public class TiposPreguntaQuery    {        /// <summary>        /// Devuelve tipospreguntas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getTiposPreguntas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de TiposPreguntas.")]        public Task<IEnumerable<clReadTiposPregunta>> GetTiposPreguntasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ITiposPreguntaService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetTiposPreguntas(userId, windowName);
        }    }}