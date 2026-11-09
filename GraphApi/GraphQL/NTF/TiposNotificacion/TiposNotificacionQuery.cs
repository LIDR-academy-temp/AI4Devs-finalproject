using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.NTF.TiposNotificacion;using GraphApi.Services.NTF.TiposNotificacion;using HotChocolate;namespace GraphApi.GraphQL.NTF.TiposNotificacion{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de TiposNotificacions.")]    public class TiposNotificacionQuery    {        /// <summary>        /// Devuelve tiposnotificacions con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getTiposNotificacions")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de TiposNotificacions.")]        public Task<IEnumerable<clReadTiposNotificacion>> GetTiposNotificacionsAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ITiposNotificacionService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetTiposNotificacions(userId, windowName);
        }    }}