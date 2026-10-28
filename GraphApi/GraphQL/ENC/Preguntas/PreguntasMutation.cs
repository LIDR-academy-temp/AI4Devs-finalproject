using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;
using GraphApi.Models.ENC.Preguntas;
using GraphApi.Services.ENC.Preguntas;
using HotChocolate;
using System.Linq;

namespace GraphApi.GraphQL.ENC.Preguntas
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de Preguntas: creación, actualización y eliminación.")]
    public class PreguntasMutation
    {
        [Authorize]
        [GraphQLName("createPreguntas")]
        [GraphQLDescription("Crea un nuevo Pregunta usando los headers 'UserID' y 'WindowName'.")]
        public async Task<clReadPreguntas> CreatePreguntasAsync(
            [GraphQLDescription("Datos necesarios para crear el Pregunta.")]
            clCreatePreguntas objInput,
            [Service]
            [GraphQLDescription("Servicio para operaciones de Pregunta.")]
            IPreguntasService objService,
            [Service] IGraphQLContextService objCtx
        )
        {
            try
            {
                var (userId, windowName) = objCtx.GetRequestContext();
                return await objService.CreatePreguntas(objInput, userId, windowName);
            }
            catch (Exception ex) when (ex is not GraphQLException)
            {
                throw new GraphQLException(ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : string.Empty));
            }
        }

        [Authorize]
        [GraphQLName("updatePreguntas")]
        [GraphQLDescription("Actualiza los campos especificados de un Pregunta existente.")]
        public async Task<clReadPreguntas?> UpdatePreguntasAsync(
            [GraphQLDescription("Datos del Pregunta a actualizar.")]
            clUpdatePreguntas objInput,
            [Service]
            [GraphQLDescription("Servicio para operaciones de Pregunta.")]
            IPreguntasService objService,
            [Service] IGraphQLContextService objCtx
        )
        {
            try
            {
                var (userId, windowName) = objCtx.GetRequestContext();
                return await objService.UpdatePreguntas(objInput, userId, windowName);
            }
            catch (Exception ex) when (ex is not GraphQLException)
            {
                throw new GraphQLException(ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : string.Empty));
            }
        }

        [Authorize]
        [GraphQLName("deletePreguntas")]
        [GraphQLDescription("Elimina un Pregunta por su ID.")]
        public async Task<bool> delPreguntasAsync(
            [GraphQLDescription("ID del Pregunta a eliminar.")]
            int nPreguntasID,
            [Service]
            [GraphQLDescription("Servicio para operaciones de Pregunta.")]
            IPreguntasService objService
        )
        {
            try
            {
                return await objService.DeletePreguntas(nPreguntasID);
            }
            catch (Exception ex) when (ex is not GraphQLException)
            {
                throw new GraphQLException(ex.Message + (ex.InnerException != null ? " | " + ex.InnerException.Message : string.Empty));
            }
        }
    }
}
