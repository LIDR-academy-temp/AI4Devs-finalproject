using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.ARC.TiposArchivo;using GraphApi.Services.ARC.TiposArchivo;using HotChocolate;namespace GraphApi.GraphQL.ARC.TiposArchivo{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de TiposArchivos.")]    public class TiposArchivoQuery    {        /// <summary>        /// Devuelve tiposarchivos con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getTiposArchivos")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de TiposArchivos.")]        public Task<IEnumerable<clReadTiposArchivo>> GetTiposArchivosAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ITiposArchivoService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetTiposArchivos(userId, windowName);
        }    }}