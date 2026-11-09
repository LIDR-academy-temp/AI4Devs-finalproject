using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.FNZ.TiposMovimiento;using GraphApi.Services.FNZ.TiposMovimiento;using HotChocolate;namespace GraphApi.GraphQL.FNZ.TiposMovimiento{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de TiposMovimientos.")]    public class TiposMovimientoQuery    {        /// <summary>        /// Devuelve tiposmovimientos con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getTiposMovimientos")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de TiposMovimientos.")]        public Task<IEnumerable<clReadTiposMovimiento>> GetTiposMovimientosAsync(            [Service] IGraphQLContextService objCtx,
            [Service] ITiposMovimientoService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetTiposMovimientos(userId, windowName);
        }    }}