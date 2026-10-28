using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.JNT.Juntas;using GraphApi.Services.JNT.Juntas;using HotChocolate;namespace GraphApi.GraphQL.JNT.Juntas{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Juntas.")]    public class JuntasQuery    {        /// <summary>        /// Devuelve juntas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getJuntas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Juntas.")]        public Task<IEnumerable<clReadJuntas>> GetJuntasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IJuntasService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetJuntas(userId, windowName);
        }    }}