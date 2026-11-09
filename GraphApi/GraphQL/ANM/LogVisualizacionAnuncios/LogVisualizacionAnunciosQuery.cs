using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.ANM.LogVisualizacionAnuncios;using GraphApi.Services.ANM.LogVisualizacionAnuncios;using HotChocolate;namespace GraphApi.GraphQL.ANM.LogVisualizacionAnuncios{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de LogVisualizacionAnuncios.")]    public class LogVisualizacionAnunciosQuery    {        /// <summary>        /// Devuelve logvisualizacionanuncios con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getLogVisualizacionAnuncios")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de LogVisualizacionAnuncios.")]        public Task<IEnumerable<clReadLogVisualizacionAnuncios>> GetLogVisualizacionAnunciosAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ILogVisualizacionAnunciosService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetLogVisualizacionAnuncios(userId, windowName);
        }    }}