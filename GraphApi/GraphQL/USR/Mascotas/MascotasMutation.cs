using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;
using GraphApi.Models.USR.Mascotas;
using GraphApi.Services.USR.Mascotas;
using HotChocolate;
using System.Linq;

namespace GraphApi.GraphQL.USR.Mascotas
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de Mascotas: creación, actualización y eliminación.")]
    public class MascotasMutation
    {
        [Authorize]
        [GraphQLName("createMascotas")]
        [GraphQLDescription("Crea un nuevo Mascota usando los headers 'UserID' y 'WindowName'.")]
        public async Task<clReadMascotas> CreateMascotasAsync(
            [GraphQLDescription("Datos necesarios para crear el Mascota.")]
            clCreateMascotas objInput,
            [Service]
            [GraphQLDescription("Servicio para operaciones de Mascota.")]
            IMascotasService objService,
            [Service] IGraphQLContextService objCtx
        )
        {
            try
            {
                var (userId, windowName) = objCtx.GetRequestContext();
                try
                {
                    Serilog.Log.Information("[RESOLVER-IN] createMascotas | WindowName={WindowName} | UserID={UserId} | Variables={Variables}", windowName, userId, System.Text.Json.JsonSerializer.Serialize(objInput));
                }
                catch { }

                return await objService.CreateMascotas(objInput, userId, windowName);
            }
            catch (Exception ex) when (ex is not GraphQLException)
            {
                throw new GraphQLException(ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : string.Empty));
            }
        }

        [Authorize]
        [GraphQLName("updateMascotas")]
        [GraphQLDescription("Actualiza los campos especificados de un Mascota existente.")]
        public async Task<clReadMascotas?> UpdateMascotasAsync(
            [GraphQLDescription("Datos del Mascota a actualizar.")]
            clUpdateMascotas objInput,
            [Service]
            [GraphQLDescription("Servicio para operaciones de Mascota.")]
            IMascotasService objService,
            [Service] IGraphQLContextService objCtx
        )
        {
            try
            {
                var (userId, windowName) = objCtx.GetRequestContext();
                try
                {
                    Serilog.Log.Information("[RESOLVER-IN] updateMascotas | WindowName={WindowName} | UserID={UserId} | Variables={Variables}", windowName, userId, System.Text.Json.JsonSerializer.Serialize(objInput));
                }
                catch { }

                return await objService.UpdateMascotas(objInput, userId, windowName);
            }
            catch (Exception ex) when (ex is not GraphQLException)
            {
                throw new GraphQLException(ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : string.Empty));
            }
        }

        [Authorize]
        [GraphQLName("deleteMascotas")]
        [GraphQLDescription("Elimina un Mascota por su ID.")]
        public async Task<bool> delMascotasAsync(
            [GraphQLDescription("ID del Mascota a eliminar.")]
            int nMascotasID,
            [Service]
            [GraphQLDescription("Servicio para operaciones de Mascota.")]
            IMascotasService objService
        )
        {
            try
            {
                return await objService.DeleteMascotas(nMascotasID);
            }
            catch (Exception ex) when (ex is not GraphQLException)
            {
                throw new GraphQLException(ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : string.Empty));
            }
        }
    }
}
