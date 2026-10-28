using HotChocolate.Authorization;
using GraphApi.Models.VTS.ReservacionesEstados;
using GraphApi.Services.VTS.ReservacionesEstados;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.ReservacionesEstados
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de ReservacionesEstados: creación, actualización y eliminación.")]
    public class ReservacionesEstadosMutation
    {
        [Authorize]
        [GraphQLName("createReservacionesEstados")]
        [GraphQLDescription("Crea un nuevo ReservacionesEstado usando los headers 'UserID' y 'WindowName'.")]
        public async Task<clReadReservacionesEstados> CreateReservacionesEstadosAsync(
            [GraphQLDescription("Datos necesarios para crear el ReservacionesEstado.")]
            clCreateReservacionesEstados objInput,
            [Service] IReservacionesEstadosService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.CreateReservacionesEstados(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("updateReservacionesEstados")]
        [GraphQLDescription("Actualiza los campos especificados de un ReservacionesEstado existente.")]
        public async Task<clReadReservacionesEstados?> UpdateReservacionesEstadosAsync(
            [GraphQLDescription("Datos del ReservacionesEstado a actualizar.")]
            clUpdateReservacionesEstados objInput,
            [Service] IReservacionesEstadosService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.UpdateReservacionesEstados(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("deleteReservacionesEstados")]
        [GraphQLDescription("Elimina un ReservacionesEstado por su ID.")]
        public async Task<bool> delReservacionesEstadosAsync(
            [GraphQLDescription("ID del ReservacionesEstado a eliminar.")]
            int nReservacionesEstadosID,
            [Service]
            [GraphQLDescription("Servicio para operaciones de ReservacionesEstado.")]
            IReservacionesEstadosService objService
        )
        {
            return await objService.DeleteReservacionesEstados(nReservacionesEstadosID);
        }
    }
}
