using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;
using GraphApi.Models.ENC.OpcionesPregunta;
using GraphApi.Services.ENC.OpcionesPregunta;
using HotChocolate;
using System.Linq;

namespace GraphApi.GraphQL.ENC.OpcionesPregunta
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de OpcionesPreguntas: creación, actualización y eliminación.")]
    public class OpcionesPreguntaMutation
    {
        [Authorize]
        [GraphQLName("createOpcionesPregunta")]
        [GraphQLDescription("Crea un nuevo OpcionesPregunta usando los headers 'UserID' y 'WindowName'.")]
        public async Task<clReadOpcionesPregunta> CreateOpcionesPreguntaAsync(
            [GraphQLDescription("Datos necesarios para crear el OpcionesPregunta.")]
            clCreateOpcionesPregunta objInput,
            [Service]
            [GraphQLDescription("Servicio para operaciones de OpcionesPregunta.")]
            IOpcionesPreguntaService objService,
            [Service] IGraphQLContextService objCtx
        )
        {
            try
            {
                var (userId, windowName) = objCtx.GetRequestContext();
                return await objService.CreateOpcionesPregunta(objInput, userId, windowName);
            }
            catch (Exception ex) when (ex is not GraphQLException)
            {
                throw new GraphQLException(ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : string.Empty));
            }
        }

        [Authorize]
        [GraphQLName("updateOpcionesPregunta")]
        [GraphQLDescription("Actualiza los campos especificados de un OpcionesPregunta existente.")]
        public async Task<clReadOpcionesPregunta?> UpdateOpcionesPreguntaAsync(
            [GraphQLDescription("Datos del OpcionesPregunta a actualizar.")]
            clUpdateOpcionesPregunta objInput,
            [Service]
            [GraphQLDescription("Servicio para operaciones de OpcionesPregunta.")]
            IOpcionesPreguntaService objService,
            [Service] IGraphQLContextService objCtx
        )
        {
            try
            {
                var (userId, windowName) = objCtx.GetRequestContext();
                return await objService.UpdateOpcionesPregunta(objInput, userId, windowName);
            }
            catch (Exception ex) when (ex is not GraphQLException)
            {
                throw new GraphQLException(ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : string.Empty));
            }
        }

        [Authorize]
        [GraphQLName("deleteOpcionesPregunta")]
        [GraphQLDescription("Elimina un OpcionesPregunta por su ID.")]
        public async Task<bool> delOpcionesPreguntaAsync(
            [GraphQLDescription("ID del OpcionesPregunta a eliminar.")]
            int nOpcionesPreguntaID,
            [Service]
            [GraphQLDescription("Servicio para operaciones de OpcionesPregunta.")]
            IOpcionesPreguntaService objService
        )
        {
            try
            {
                return await objService.DeleteOpcionesPregunta(nOpcionesPreguntaID);
            }
            catch (Exception ex) when (ex is not GraphQLException)
            {
                throw new GraphQLException(ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : string.Empty));
            }
        }
    }
}
