using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.USR.RazasMascota;using GraphApi.Services.USR.RazasMascota;using HotChocolate;namespace GraphApi.GraphQL.USR.RazasMascota{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de RazasMascotas.")]    public class RazasMascotaQuery    {        /// <summary>        /// Devuelve razasmascotas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getRazasMascotas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de RazasMascotas.")]        public Task<IEnumerable<clReadRazasMascota>> GetRazasMascotasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IRazasMascotaService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetRazasMascotas(userId, windowName);
        }    }}