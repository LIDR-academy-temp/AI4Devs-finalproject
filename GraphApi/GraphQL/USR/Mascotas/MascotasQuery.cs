using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.USR.Mascotas;using GraphApi.Services.USR.Mascotas;using HotChocolate;namespace GraphApi.GraphQL.USR.Mascotas{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Mascotas.")]    public class MascotasQuery    {        /// <summary>        /// Devuelve mascotas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getMascotas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Mascotas.")]        public Task<IEnumerable<clReadMascotas>> GetMascotasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IMascotasService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetMascotas(userId, windowName);
        }    }}