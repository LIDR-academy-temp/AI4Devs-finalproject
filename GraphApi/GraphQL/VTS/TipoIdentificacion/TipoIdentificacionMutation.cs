using HotChocolate.Authorization;
using GraphApi.Models.VTS.TipoIdentificacion;
using GraphApi.Services.VTS.TipoIdentificacion;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.TipoIdentificacion
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de TipoIdentificacions: creación, actualización y eliminación.")]
    public class TipoIdentificacionMutation
    {
        [Authorize]
        [GraphQLName("createTipoIdentificacion")]
        [GraphQLDescription("Crea un nuevo TipoIdentificacion usando los headers 'UserID' y 'WindowName'.")]
        public async Task<clReadTipoIdentificacion> CreateTipoIdentificacionAsync(
            [GraphQLDescription("Datos necesarios para crear el TipoIdentificacion.")]
            clCreateTipoIdentificacion objInput,
            [Service] ITipoIdentificacionService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.CreateTipoIdentificacion(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("updateTipoIdentificacion")]
        [GraphQLDescription("Actualiza los campos especificados de un TipoIdentificacion existente.")]
        public async Task<clReadTipoIdentificacion?> UpdateTipoIdentificacionAsync(
            [GraphQLDescription("Datos del TipoIdentificacion a actualizar.")]
            clUpdateTipoIdentificacion objInput,
            [Service] ITipoIdentificacionService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.UpdateTipoIdentificacion(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("deleteTipoIdentificacion")]
        [GraphQLDescription("Elimina un TipoIdentificacion por su ID.")]
        public async Task<bool> delTipoIdentificacionAsync(
            [GraphQLDescription("ID del TipoIdentificacion a eliminar.")]
            int nTipoIdentificacionID,
            [Service]
            [GraphQLDescription("Servicio para operaciones de TipoIdentificacion.")]
            ITipoIdentificacionService objService
        )
        {
            return await objService.DeleteTipoIdentificacion(nTipoIdentificacionID);
        }
    }
}
