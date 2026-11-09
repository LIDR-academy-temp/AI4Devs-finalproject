using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.ARC.Archivos;using GraphApi.Services.ARC.Archivos;using HotChocolate;namespace GraphApi.GraphQL.ARC.Archivos{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Archivos.")]    public class ArchivosQuery    {        /// <summary>        /// Devuelve archivos con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getArchivos")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Archivos.")]        public Task<IEnumerable<clReadArchivos>> GetArchivosAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IArchivosService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetArchivos(userId, windowName);
        }    }}