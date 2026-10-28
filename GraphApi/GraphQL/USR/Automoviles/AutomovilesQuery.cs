using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.USR.Automoviles;using GraphApi.Services.USR.Automoviles;using HotChocolate;namespace GraphApi.GraphQL.USR.Automoviles{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Automoviles.")]    public class AutomovilesQuery    {        /// <summary>        /// Devuelve automoviles con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getAutomoviles")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Automoviles.")]        public Task<IEnumerable<clReadAutomoviles>> GetAutomovilesAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IAutomovilesService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetAutomoviles(userId, windowName);
        }    }}