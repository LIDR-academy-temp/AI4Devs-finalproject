using HotChocolate.Authorization;
using GraphApi.Models.VTS.ReservacionesArea;
using GraphApi.Services.VTS.ReservacionesArea;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.ReservacionesArea
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de ReservacionesAreas: creación, actualización y eliminación.")]
    public class ReservacionesAreaMutation
    {
        [Authorize]
        [GraphQLName("createReservacionesArea")]
        [GraphQLDescription("Crea un nuevo ReservacionesArea usando los headers 'UserID' y 'WindowName'.")]
        public async Task<clReadReservacionesArea> CreateReservacionesAreaAsync(
            [GraphQLDescription("Datos necesarios para crear el ReservacionesArea.")]
            clCreateReservacionesArea objInput,
            [Service] IReservacionesAreaService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.CreateReservacionesArea(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("updateReservacionesArea")]
        [GraphQLDescription("Actualiza los campos especificados de un ReservacionesArea existente.")]
        public async Task<clReadReservacionesArea?> UpdateReservacionesAreaAsync(
            [GraphQLDescription("Datos del ReservacionesArea a actualizar.")]
            clUpdateReservacionesArea objInput,
            [Service] IReservacionesAreaService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.UpdateReservacionesArea(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("deleteReservacionesArea")]
        [GraphQLDescription("Elimina un ReservacionesArea por su ID.")]
        public async Task<bool> delReservacionesAreaAsync(
            [GraphQLDescription("ID del ReservacionesArea a eliminar.")]
            int nReservacionesAreaID,
            [Service]
            [GraphQLDescription("Servicio para operaciones de ReservacionesArea.")]
            IReservacionesAreaService objService
        )
        {
            return await objService.DeleteReservacionesArea(nReservacionesAreaID);
        }
    }
}
