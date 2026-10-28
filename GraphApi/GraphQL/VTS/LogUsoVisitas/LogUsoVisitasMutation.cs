using HotChocolate.Authorization;
using GraphApi.Models.VTS.LogUsoVisitas;
using GraphApi.Services.VTS.LogUsoVisitas;
using GraphApi.Infrastructure.Services;
using HotChocolate;

namespace GraphApi.GraphQL.VTS.LogUsoVisitas
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de LogUsoVisitas: creación, actualización y eliminación.")]
    public class LogUsoVisitasMutation
    {
        [Authorize]
        [GraphQLName("createLogUsoVisitas")]
        [GraphQLDescription("Crea un nuevo LogUsoVisita usando los headers 'UserID' y 'WindowName'.")]
        public async Task<clReadLogUsoVisitas> CreateLogUsoVisitasAsync(
            [GraphQLDescription("Datos necesarios para crear el LogUsoVisita.")]
            clCreateLogUsoVisitas objInput,
            [Service] ILogUsoVisitasService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.CreateLogUsoVisitas(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("updateLogUsoVisitas")]
        [GraphQLDescription("Actualiza los campos especificados de un LogUsoVisita existente.")]
        public async Task<clReadLogUsoVisitas?> UpdateLogUsoVisitasAsync(
            [GraphQLDescription("Datos del LogUsoVisita a actualizar.")]
            clUpdateLogUsoVisitas objInput,
            [Service] ILogUsoVisitasService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.UpdateLogUsoVisitas(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("deleteLogUsoVisitas")]
        [GraphQLDescription("Elimina un LogUsoVisita por su ID.")]
        public async Task<bool> delLogUsoVisitasAsync(
            [GraphQLDescription("ID del LogUsoVisita a eliminar.")]
            int nLogUsoVisitasID,
            [Service]
            [GraphQLDescription("Servicio para operaciones de LogUsoVisita.")]
            ILogUsoVisitasService objService
        )
        {
            return await objService.DeleteLogUsoVisitas(nLogUsoVisitasID);
        }
    }
}
