using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.NTF.Notificaciones;using GraphApi.Services.NTF.Notificaciones;using HotChocolate;namespace GraphApi.GraphQL.NTF.Notificaciones{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Notificaciones.")]    public class NotificacionesQuery    {        /// <summary>        /// Devuelve notificaciones con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getNotificaciones")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Notificaciones.")]        public Task<IEnumerable<clReadNotificaciones>> GetNotificacionesAsync(            [Service] IGraphQLContextService objCtx,
            [Service] INotificacionesService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetNotificaciones(userId, windowName);
        }    }}