using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.FNZ.Cuotas;using GraphApi.Services.FNZ.Cuotas;using HotChocolate;namespace GraphApi.GraphQL.FNZ.Cuotas{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Cuotas.")]    public class CuotasQuery    {        /// <summary>        /// Devuelve cuotas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getCuotas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Cuotas.")]        public Task<IEnumerable<clReadCuotas>> GetCuotasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ICuotasService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetCuotas(userId, windowName);
        }    }}