using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.SGR.Perfiles;using GraphApi.Services.SGR.Perfiles;using HotChocolate;namespace GraphApi.GraphQL.SGR.Perfiles{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de Perfiles.")]    public class PerfilesQuery    {        /// <summary>        /// Devuelve perfiles con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getPerfiles")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Perfiles.")]        public Task<IEnumerable<clReadPerfiles>> GetPerfilesAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IPerfilesService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetPerfiles(userId, windowName);
        }    }}