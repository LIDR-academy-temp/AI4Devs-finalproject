using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.USR.Parientes;using GraphApi.Services.USR.Parientes;using HotChocolate;namespace GraphApi.GraphQL.USR.Parientes{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Parientes.")]    public class ParientesQuery    {        /// <summary>        /// Devuelve parientes con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getParientes")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Parientes.")]        public Task<IEnumerable<clReadParientes>> GetParientesAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IParientesService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetParientes(userId, windowName);
        }    }}