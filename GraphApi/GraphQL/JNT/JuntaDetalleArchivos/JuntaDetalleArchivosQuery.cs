using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.JNT.JuntaDetalleArchivos;using GraphApi.Services.JNT.JuntaDetalleArchivos;using HotChocolate;namespace GraphApi.GraphQL.JNT.JuntaDetalleArchivos{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de JuntaDetalleArchivos.")]    public class JuntaDetalleArchivosQuery    {        /// <summary>        /// Devuelve juntadetallearchivos con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getJuntaDetalleArchivos")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de JuntaDetalleArchivos.")]        public Task<IEnumerable<clReadJuntaDetalleArchivos>> GetJuntaDetalleArchivosAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IJuntaDetalleArchivosService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetJuntaDetalleArchivos(userId, windowName);
        }    }}