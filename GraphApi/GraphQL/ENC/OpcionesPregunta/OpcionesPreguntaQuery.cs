using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.ENC.OpcionesPregunta;using GraphApi.Services.ENC.OpcionesPregunta;using HotChocolate;namespace GraphApi.GraphQL.ENC.OpcionesPregunta{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de OpcionesPreguntas.")]    public class OpcionesPreguntaQuery    {        /// <summary>        /// Devuelve opcionespreguntas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getOpcionesPreguntas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de OpcionesPreguntas.")]        public Task<IEnumerable<clReadOpcionesPregunta>> GetOpcionesPreguntasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IOpcionesPreguntaService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetOpcionesPreguntas(userId, windowName);
        }    }}