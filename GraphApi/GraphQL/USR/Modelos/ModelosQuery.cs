using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.USR.Modelos;using GraphApi.Services.USR.Modelos;using HotChocolate;namespace GraphApi.GraphQL.USR.Modelos{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Modelos.")]    public class ModelosQuery    {        /// <summary>        /// Devuelve modelos con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getModelos")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Modelos.")]        public Task<IEnumerable<clReadModelos>> GetModelosAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IModelosService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetModelos(userId, windowName);
        }    }}