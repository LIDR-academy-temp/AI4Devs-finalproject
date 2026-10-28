using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.NTF.NotificacionesVisualizadas;using GraphApi.Services.NTF.NotificacionesVisualizadas;using HotChocolate;namespace GraphApi.GraphQL.NTF.NotificacionesVisualizadas{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de NotificacionesVisualizadas.")]    public class NotificacionesVisualizadasQuery    {        /// <summary>        /// Devuelve notificacionesvisualizadas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getNotificacionesVisualizadas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de NotificacionesVisualizadas.")]        public Task<IEnumerable<clReadNotificacionesVisualizadas>> GetNotificacionesVisualizadasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] INotificacionesVisualizadasService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetNotificacionesVisualizadas(userId, windowName);
        }    }}