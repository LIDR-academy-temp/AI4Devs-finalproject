using HotChocolate.Authorization;
using GraphApi.Models.SGR.Usuarios;
using GraphApi.Services.SGR.Usuarios;
using GraphApi.Infrastructure.Services;
using HotChocolate;
using System.Threading.Tasks;

namespace GraphApi.GraphQL.SGR.Usuarios
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de Usuarios: creación, actualización y eliminación.")]
    public class UsuariosMutation
    {
        [Authorize]
        [GraphQLName("createUsuarios")]
        [GraphQLDescription("Crea un nuevo Usuario usando los headers 'UserID' y 'WindowName'.")]
        public async Task<clReadUsuarios> CreateUsuariosAsync(
            [GraphQLDescription("Datos necesarios para crear el Usuario.")]
            clCreateUsuarios objInput,
            [Service, GraphQLDescription("Servicio para operaciones de Usuario.")]
            IUsuariosService objService,
            [Service, GraphQLDescription("Contexto del request (UserID, WindowName).")]
            IGraphQLContextService objCtx
        )
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.CreateUsuarios(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("updateUsuarios")]
        [GraphQLDescription("Actualiza los campos especificados de un Usuario existente.")]
        public async Task<clReadUsuarios?> UpdateUsuariosAsync(
            [GraphQLDescription("Datos del Usuario a actualizar.")]
            clUpdateUsuarios objInput,
            [Service, GraphQLDescription("Servicio para operaciones de Usuario.")]
            IUsuariosService objService,
            [Service, GraphQLDescription("Contexto del request (UserID, WindowName).")]
            IGraphQLContextService objCtx
        )
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.UpdateUsuarios(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("deleteUsuarios")]
        [GraphQLDescription("Elimina un Usuario por su ID.")]
        public async Task<bool> delUsuariosAsync(
            [GraphQLDescription("ID del Usuario a eliminar.")]
            int nUsuariosID,
            [Service, GraphQLDescription("Servicio para operaciones de Usuario.")]
            IUsuariosService objService
        )
        {
            return await objService.DeleteUsuarios(nUsuariosID);
        }
    }
}

