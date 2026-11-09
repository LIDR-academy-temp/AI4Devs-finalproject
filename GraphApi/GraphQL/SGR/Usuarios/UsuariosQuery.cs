using HotChocolate.Authorization;
using GraphApi.Models.SGR.Usuarios;
using GraphApi.Services.SGR.Usuarios;
using GraphApi.Infrastructure.Services;
using HotChocolate;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace GraphApi.GraphQL.SGR.Usuarios
{
    [QueryType]
    [GraphQLDescription("Punto de entrada para las consultas de Usuarios.")]
    public class UsuariosQuery
    {
        [UsePaging, UseFiltering, UseSorting, Authorize]
        [GraphQLName("getUsuarios")]
        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de Usuarios.")]
        public Task<IEnumerable<clReadUsuarios>> GetUsuariosAsync(
            [Service, GraphQLDescription("Contexto del request (UserID, WindowName).")]
            IGraphQLContextService objCtx,
            [Service, GraphQLDescription("Servicio de acceso a datos para Usuarios.")]
            IUsuariosService objService
        )
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetUsuarios(userId, windowName);
        }
    }
}

