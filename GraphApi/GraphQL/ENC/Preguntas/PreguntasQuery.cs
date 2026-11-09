using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.ENC.Preguntas;using GraphApi.Services.ENC.Preguntas;using HotChocolate;namespace GraphApi.GraphQL.ENC.Preguntas{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Preguntas.")]    public class PreguntasQuery    {        /// <summary>        /// Devuelve preguntas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getPreguntas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Preguntas.")]        public Task<IEnumerable<clReadPreguntas>> GetPreguntasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IPreguntasService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetPreguntas(userId, windowName);
        }    }}