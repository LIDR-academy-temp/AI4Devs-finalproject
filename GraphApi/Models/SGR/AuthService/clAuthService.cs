using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.Security.AuthService
{
    [SwaggerSchema("Modelo de respuesta de un Token")]
    [GraphQLDescription("Modelo de respuesta de un Token")]
    public class clAuthServiceResponse
    {
        [SwaggerSchema("Token de acceso JWT")]
        [GraphQLNonNullType]
        [GraphQLDescription("Token de acceso JWT")]
        public string Token { get; set; } = default!;
        [SwaggerSchema("Fecha de expiración del Token")]
        [GraphQLNonNullType]
        [GraphQLDescription("Fecha de expiración del Token")]
        public DateTime Expires { get; set; }
    }

    [SwaggerSchema("Modelo de solicitud de un Token.")]
    [GraphQLDescription("Modelo de respuesta de un Token")]
    public class clAuthServiceRequest
    {
        [SwaggerSchema("Usuario para autenticación")]
        [GraphQLNonNullType]
        [GraphQLDescription("Usuario para autenticación")]
        public string NombreUsuario { get; set; } = default!;
        [SwaggerSchema("Password para autenticación")]
        [GraphQLNonNullType]
        [GraphQLDescription("Password para autenticación")]
        public string Password { get; set; } = default!;
    }
    
}
