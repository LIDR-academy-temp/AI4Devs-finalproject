using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.FNZ.Transacciones;using GraphApi.Services.FNZ.Transacciones;using HotChocolate;namespace GraphApi.GraphQL.FNZ.Transacciones{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Transacciones.")]    public class TransaccionesQuery    {        /// <summary>        /// Devuelve transacciones con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getTransacciones")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Transacciones.")]        public Task<IEnumerable<clReadTransacciones>> GetTransaccionesAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ITransaccionesService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetTransacciones(userId, windowName);
        }    }}