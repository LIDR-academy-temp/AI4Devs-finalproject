using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.JNT.JuntaDetalle;using GraphApi.Services.JNT.JuntaDetalle;using HotChocolate;namespace GraphApi.GraphQL.JNT.JuntaDetalle{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de JuntaDetalles.")]    public class JuntaDetalleQuery    {        /// <summary>        /// Devuelve juntadetalles con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getJuntaDetalles")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de JuntaDetalles.")]        public Task<IEnumerable<clReadJuntaDetalle>> GetJuntaDetallesAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IJuntaDetalleService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetJuntaDetalles(userId, windowName);
        }    }}