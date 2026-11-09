using HotChocolate.Authorization;
using GraphApi.Models.VTS.VisitasGeneradas;
using GraphApi.Services.VTS.VisitasGeneradas;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.VisitasGeneradas
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de VisitasGeneradas: creación, actualización y eliminación.")]
    public class VisitasGeneradasMutation
    {
        [Authorize]
        [GraphQLName("createVisitasGeneradas")]
        [GraphQLDescription("Crea un nuevo VisitasGenerada usando los headers 'UserID' y 'WindowName'.")]
        public async Task<clReadVisitasGeneradas> CreateVisitasGeneradasAsync(
            [GraphQLDescription("Datos necesarios para crear el VisitasGenerada.")]
            clCreateVisitasGeneradas objInput,
            [Service] IVisitasGeneradasService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.CreateVisitasGeneradas(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("updateVisitasGeneradas")]
        [GraphQLDescription("Actualiza los campos especificados de un VisitasGenerada existente.")]
        public async Task<clReadVisitasGeneradas?> UpdateVisitasGeneradasAsync(
            [GraphQLDescription("Datos del VisitasGenerada a actualizar.")]
            clUpdateVisitasGeneradas objInput,
            [Service] IVisitasGeneradasService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.UpdateVisitasGeneradas(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("deleteVisitasGeneradas")]
        [GraphQLDescription("Elimina un VisitasGenerada por su ID.")]
        public async Task<bool> delVisitasGeneradasAsync(
            [GraphQLDescription("ID del VisitasGenerada a eliminar.")]
            int nVisitasGeneradasID,
            [Service]
            [GraphQLDescription("Servicio para operaciones de VisitasGenerada.")]
            IVisitasGeneradasService objService
        )
        {
            return await objService.DeleteVisitasGeneradas(nVisitasGeneradasID);
        }
    }
}
