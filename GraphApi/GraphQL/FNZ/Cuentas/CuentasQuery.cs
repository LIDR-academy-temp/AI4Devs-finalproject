using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.FNZ.Cuentas;using GraphApi.Services.FNZ.Cuentas;using HotChocolate;namespace GraphApi.GraphQL.FNZ.Cuentas{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Cuentas.")]    public class CuentasQuery    {        /// <summary>        /// Devuelve cuentas con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getCuentas")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Cuentas.")]        public Task<IEnumerable<clReadCuentas>> GetCuentasAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ICuentasService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetCuentas(userId, windowName);
        }    }}