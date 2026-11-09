using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.USR.TiposMascota;using GraphApi.Services.USR.TiposMascota;using HotChocolate;namespace GraphApi.GraphQL.USR.TiposMascota{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de TiposMascotas.")]    public class TiposMascotaQuery    {        /// <summary>        /// Devuelve tiposmascotas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getTiposMascotas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de TiposMascotas.")]        public Task<IEnumerable<clReadTiposMascota>> GetTiposMascotasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ITiposMascotaService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetTiposMascotas(userId, windowName);
        }    }}