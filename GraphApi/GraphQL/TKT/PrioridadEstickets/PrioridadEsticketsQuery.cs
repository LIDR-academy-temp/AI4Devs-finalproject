using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.TKT.PrioridadEstickets;using GraphApi.Services.TKT.PrioridadEstickets;using HotChocolate;namespace GraphApi.GraphQL.TKT.PrioridadEstickets{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de PrioridadEstickets.")]    public class PrioridadEsticketsQuery    {        /// <summary>        /// Devuelve prioridadestickets con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getPrioridadEstickets")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de PrioridadEstickets.")]        public Task<IEnumerable<clReadPrioridadEstickets>> GetPrioridadEsticketsAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IPrioridadEsticketsService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetPrioridadEstickets(userId, windowName);
        }    }}