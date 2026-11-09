using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.SGR.PerfilMenuBotones;using GraphApi.Services.SGR.PerfilMenuBotones;using HotChocolate;namespace GraphApi.GraphQL.SGR.PerfilMenuBotones{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de PerfilMenuBotones.")]    public class PerfilMenuBotonesQuery    {        /// <summary>        /// Devuelve perfilmenubotones con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getPerfilMenuBotones")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de PerfilMenuBotones.")]        public Task<IEnumerable<clReadPerfilMenuBotones>> GetPerfilMenuBotonesAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IPerfilMenuBotonesService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetPerfilMenuBotones(userId, windowName);
        }    }}