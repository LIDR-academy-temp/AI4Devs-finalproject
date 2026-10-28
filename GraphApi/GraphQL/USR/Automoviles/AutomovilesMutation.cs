using HotChocolate.Authorization;
using Serilog;
using System.Text.Json;
using GraphApi.Infrastructure.Services;
using GraphApi.Models.USR.Automoviles;
using GraphApi.Services.USR.Automoviles;
using HotChocolate;
using System.Linq;

namespace GraphApi.GraphQL.USR.Automoviles
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de Automoviles: creación, actualización y eliminación.")]
    public class AutomovilesMutation
    {
        [Authorize]
        [GraphQLName("createAutomoviles")]
        [GraphQLDescription("Crea un nuevo Automovile usando los headers 'UserID' y 'WindowName'.")]
        public async Task<clReadAutomoviles> CreateAutomovilesAsync(
            [GraphQLDescription("Datos necesarios para crear el Automovile.")]
            clCreateAutomoviles objInput,
            [Service]
            [GraphQLDescription("Servicio para operaciones de Automovile.")]
            IAutomovilesService objService,
            [Service] IGraphQLContextService objCtx
        )
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            try
            {
                Log.Information("[RESOLVER-IN] createAutomoviles | WindowName={WindowName} | UserID={UserId} | Variables={Variables}", windowName, userId, JsonSerializer.Serialize(objInput));
            }
            catch { }

            return await objService.CreateAutomoviles(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("updateAutomoviles")]
        [GraphQLDescription("Actualiza los campos especificados de un Automovile existente.")]
        public async Task<clReadAutomoviles?> UpdateAutomovilesAsync(
            [GraphQLDescription("Datos del Automovile a actualizar.")]
            clUpdateAutomoviles objInput,
            [Service]
            [GraphQLDescription("Servicio para operaciones de Automovile.")]
            IAutomovilesService objService,
            [Service] IGraphQLContextService objCtx
        )
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            try
            {
                Log.Information("[RESOLVER-IN] updateAutomoviles | WindowName={WindowName} | UserID={UserId} | Variables={Variables}", windowName, userId, JsonSerializer.Serialize(objInput));
            }
            catch { }

            return await objService.UpdateAutomoviles(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("deleteAutomoviles")]
        [GraphQLDescription("Elimina un Automovile por su ID.")]
        public async Task<bool> delAutomovilesAsync(
            [GraphQLDescription("ID del Automovile a eliminar.")]
            int nAutomovilesID,
            [Service]
            [GraphQLDescription("Servicio para operaciones de Automovile.")]
            IAutomovilesService objService
        )
        {
            return await objService.DeleteAutomoviles(nAutomovilesID);
        }
    }
}
