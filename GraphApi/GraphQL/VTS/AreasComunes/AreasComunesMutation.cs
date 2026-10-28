using HotChocolate.Authorization;
using GraphApi.Models.VTS.AreasComunes;
using GraphApi.Services.VTS.AreasComunes;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.AreasComunes
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de AreasComunes: creación, actualización y eliminación.")]
    public class AreasComunesMutation
    {
        [Authorize]
        [GraphQLName("createAreasComunes")]
        [GraphQLDescription("Crea un nuevo AreasComune usando los headers 'UserID' y 'WindowName'.")]
        public async Task<clReadAreasComunes> CreateAreasComunesAsync(
            [GraphQLDescription("Datos necesarios para crear el AreasComune.")]
            clCreateAreasComunes objInput,
            [Service] IAreasComunesService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.CreateAreasComunes(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("updateAreasComunes")]
        [GraphQLDescription("Actualiza los campos especificados de un AreasComune existente.")]
        public async Task<clReadAreasComunes?> UpdateAreasComunesAsync(
            [GraphQLDescription("Datos del AreasComune a actualizar.")]
            clUpdateAreasComunes objInput,
            [Service] IAreasComunesService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.UpdateAreasComunes(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("deleteAreasComunes")]
        [GraphQLDescription("Elimina un AreasComune por su ID.")]
        public async Task<bool> delAreasComunesAsync(
            [GraphQLDescription("ID del AreasComune a eliminar.")]
            int nAreasComunesID,
            [Service]
            [GraphQLDescription("Servicio para operaciones de AreasComune.")]
            IAreasComunesService objService
        )
        {
            return await objService.DeleteAreasComunes(nAreasComunesID);
        }
    }
}
