using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.SGR.Usuarios
{
    [SwaggerSchema("Modelo de lectura de un Usuario")]
    [GraphQLDescription("Objeto que representa un Usuario existente.")]
    public class clReadUsuarios
    {
        [SwaggerSchema("Identificador único del Usuario")]
        [GraphQLDescription("Identificador único del Usuario")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("CorreoUsuario")]
        [GraphQLDescription("CorreoUsuario")]
        public string? CorreoUsuario { get; set; } = default!;
        [SwaggerSchema("PerfilID")]
        [GraphQLDescription("PerfilID")]
        public int? PerfilID { get; set; }
        [SwaggerSchema("Perfil")]
        [GraphQLDescription("Perfil")]
        public string? Perfil { get; set; } = default!;
        [SwaggerSchema("bAdministrador")]
        [GraphQLDescription("bAdministrador")]
        public bool? bAdministrador { get; set; }
        [SwaggerSchema("PasswordUsuario")]
        [GraphQLDescription("PasswordUsuario")]
        public string? PasswordUsuario { get; set; } = default!;
        [SwaggerSchema("NombreUsuario")]
        [GraphQLDescription("NombreUsuario")]
        public string? NombreUsuario { get; set; } = default!;
        [SwaggerSchema("TelefonoUsuario")]
        [GraphQLDescription("TelefonoUsuario")]
        public string? TelefonoUsuario { get; set; }
        [SwaggerSchema("FotoUrlUsuario")]
        [GraphQLDescription("FotoUrlUsuario")]
        public string? FotoUrlUsuario { get; set; }
        [SwaggerSchema("bActivoUsuario")]
        [GraphQLDescription("bActivoUsuario")]
        public bool? bActivoUsuario { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
        [SwaggerSchema("bActualizarPassword")]
        [GraphQLDescription("bActualizarPassword")]
        public bool? bActualizarPassword { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Usuario")]
    [GraphQLDescription("Input para crear un Usuario.")]
    public class clCreateUsuarios
    {
        [GraphQLNonNullType] [SwaggerSchema("CorreoUsuario")]
        [GraphQLDescription("CorreoUsuario")]
        public string CorreoUsuario { get; set; } = default!;
        [SwaggerSchema("PerfilID")]
        [GraphQLDescription("PerfilID")]
        public int? PerfilID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("PasswordUsuario")]
        [GraphQLDescription("PasswordUsuario")]
        public string PasswordUsuario { get; set; } = default!;
        [GraphQLNonNullType] [SwaggerSchema("NombreUsuario")]
        [GraphQLDescription("NombreUsuario")]
        public string NombreUsuario { get; set; } = default!;
        [GraphQLNonNullType] [SwaggerSchema("bActivoUsuario")]
        [GraphQLDescription("bActivoUsuario")]
        public bool bActivoUsuario { get; set; }
        [SwaggerSchema("TelefonoUsuario")]
        [GraphQLDescription("TelefonoUsuario")]
        public string? TelefonoUsuario { get; set; }
        [SwaggerSchema("FotoUrlUsuario")]
        [GraphQLDescription("FotoUrlUsuario")]
        public string? FotoUrlUsuario { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bActualizarPassword")]
        [GraphQLDescription("bActualizarPassword")]
        public bool bActualizarPassword { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Usuario")]
    [GraphQLDescription("Input para actualizar parcialmente un Usuario.")]
    public class clUpdateUsuarios
    {
        [SwaggerSchema("Identificador único del Usuario")]
        [GraphQLDescription("Identificador único del Usuario")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("CorreoUsuario")]
        [GraphQLDescription("CorreoUsuario")]
        public string? CorreoUsuario { get; set; }
        [SwaggerSchema("PerfilID")]
        [GraphQLDescription("PerfilID")]
        public int? PerfilID { get; set; }
        [SwaggerSchema("PasswordUsuario")]
        [GraphQLDescription("PasswordUsuario")]
        public string? PasswordUsuario { get; set; }
        [SwaggerSchema("NombreUsuario")]
        [GraphQLDescription("NombreUsuario")]
        public string? NombreUsuario { get; set; }
        [SwaggerSchema("bActivoUsuario")]
        [GraphQLDescription("bActivoUsuario")]
        public bool? bActivoUsuario { get; set; }
        [SwaggerSchema("TelefonoUsuario")]
        [GraphQLDescription("TelefonoUsuario")]
        public string? TelefonoUsuario { get; set; }
        [SwaggerSchema("FotoUrlUsuario")]
        [GraphQLDescription("FotoUrlUsuario")]
        public string? FotoUrlUsuario { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
        [SwaggerSchema("bActualizarPassword")]
        [GraphQLDescription("bActualizarPassword")]
        public bool? bActualizarPassword { get; set; }
    }
}
