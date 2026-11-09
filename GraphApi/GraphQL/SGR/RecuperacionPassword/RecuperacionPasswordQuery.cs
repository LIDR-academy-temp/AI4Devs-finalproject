using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.SGR.RecuperacionPassword;using GraphApi.Services.SGR.RecuperacionPassword;using HotChocolate;namespace GraphApi.GraphQL.SGR.RecuperacionPassword{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de RecuperacionPasswords.")]    public class RecuperacionPasswordQuery    {        /// <summary>        /// Devuelve recuperacionpasswords con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getRecuperacionPasswords")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de RecuperacionPasswords.")]        public Task<IEnumerable<clReadRecuperacionPassword>> GetRecuperacionPasswordsAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IRecuperacionPasswordService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetRecuperacionPasswords(userId, windowName);
        }    }}