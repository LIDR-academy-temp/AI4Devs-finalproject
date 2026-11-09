using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.ARC.LogVisualizacionArchivos;using GraphApi.Services.ARC.LogVisualizacionArchivos;using HotChocolate;namespace GraphApi.GraphQL.ARC.LogVisualizacionArchivos{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de LogVisualizacionArchivos.")]    public class LogVisualizacionArchivosQuery    {        /// <summary>        /// Devuelve logvisualizacionarchivos con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getLogVisualizacionArchivos")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de LogVisualizacionArchivos.")]        public Task<IEnumerable<clReadLogVisualizacionArchivos>> GetLogVisualizacionArchivosAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ILogVisualizacionArchivosService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetLogVisualizacionArchivos(userId, windowName);
        }    }}