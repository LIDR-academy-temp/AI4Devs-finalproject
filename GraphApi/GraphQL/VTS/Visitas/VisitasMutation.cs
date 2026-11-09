using HotChocolate.Authorization;
using GraphApi.Models.VTS.Visitas;
using GraphApi.Services.VTS.Visitas;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.Visitas
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de Visitas: creación, actualización y eliminación.")]
    public class VisitasMutation
    {
        [Authorize]
        [GraphQLName("createVisitas")]
        [GraphQLDescription("Crea un nuevo Visita usando los headers 'UserID' y 'WindowName'.")]
        public async Task<clReadVisitas> CreateVisitasAsync(
            [GraphQLDescription("Datos necesarios para crear el Visita.")]
            clCreateVisitas objInput,
            [Service] IVisitasService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.CreateVisitas(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("updateVisitas")]
        [GraphQLDescription("Actualiza los campos especificados de un Visita existente.")]
        public async Task<clReadVisitas?> UpdateVisitasAsync(
            [GraphQLDescription("Datos del Visita a actualizar.")]
            clUpdateVisitas objInput,
            [Service] IVisitasService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.UpdateVisitas(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("deleteVisitas")]
        [GraphQLDescription("Elimina un Visita por su ID.")]
        public async Task<bool> delVisitasAsync(
            [GraphQLDescription("ID del Visita a eliminar.")]
            int nVisitasID,
            [Service]
            [GraphQLDescription("Servicio para operaciones de Visita.")]
            IVisitasService objService
        )
        {
            return await objService.DeleteVisitas(nVisitasID);
        }
    }
}
