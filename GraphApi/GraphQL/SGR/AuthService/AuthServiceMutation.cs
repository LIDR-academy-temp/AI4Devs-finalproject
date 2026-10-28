using GraphApi.Models.Security.AuthService;
using GraphApi.Models.WMS.Inventory;
using GraphApi.Services.Security.AuthService;
using GraphApi.Services.WMS.Inventory;
using Microsoft.AspNetCore.Hosting.Server;

namespace GraphApi.GraphQL.SGR.AuthService
{
    [MutationType]
    [GraphQLDescription("Generación de tokens JWT para clientes API")]
    public class AuthServiceMutation
    {
        
        

        [GraphQLName("getgenerarToken")]
        [GraphQLDescription("Valida credenciales y genera un token JWT con fecha de expiración.")]
        public async Task<clAuthServiceResponse> GenerarTokenAsync(
            [GraphQLDescription("Credenciales del usuario.")]
            clAuthServiceRequest input,
            [Service]
            [GraphQLDescription("Servicio de autenticación.")]
            IAuthService authService,
            CancellationToken ct)
        {
            try
            {
                var result = await authService.Authenticate(input);

                return result; 
            }
            catch (UnauthorizedAccessException)
            {
                // Respuesta uniforme de error de negocio
                return new clAuthServiceResponse
                {
                    Token = "Error al generar token"
                };
            }
            catch (Exception)
            {
                // Evita filtrar detalles internos
                return new clAuthServiceResponse
                {
                    Token = "Error al generar token"
                };
            }
        }
    }
}
