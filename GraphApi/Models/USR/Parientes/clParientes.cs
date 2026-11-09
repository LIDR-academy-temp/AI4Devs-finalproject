using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.USR.Parientes
{
    [SwaggerSchema("Modelo de lectura de un Pariente")]
    [GraphQLDescription("Objeto que representa un Pariente existente.")]
    public class clReadParientes
    {
        [SwaggerSchema("Identificador único del Pariente")]
        [GraphQLDescription("Identificador único del Pariente")]
        public int? ParienteID { get; set; }
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("NombreUsuario")]
        [GraphQLDescription("NombreUsuario")]
        public string? NombreUsuario { get; set; } = default!;
        [SwaggerSchema("CorreoUsuario")]
        [GraphQLDescription("CorreoUsuario")]
        public string? CorreoUsuario { get; set; } = default!;
        [SwaggerSchema("NombrePariente")]
        [GraphQLDescription("NombrePariente")]
        public string? NombrePariente { get; set; } = default!;
        [SwaggerSchema("ParentescoID")]
        [GraphQLDescription("ParentescoID")]
        public int? ParentescoID { get; set; }
        [SwaggerSchema("Parentesco")]
        [GraphQLDescription("Parentesco")]
        public string? Parentesco { get; set; } = default!;
        [SwaggerSchema("TelefonoPariente")]
        [GraphQLDescription("TelefonoPariente")]
        public string? TelefonoPariente { get; set; }
        [SwaggerSchema("CorreoPariente")]
        [GraphQLDescription("CorreoPariente")]
        public string? CorreoPariente { get; set; }
        [SwaggerSchema("EsContactoEmergencia")]
        [GraphQLDescription("EsContactoEmergencia")]
        public bool? EsContactoEmergencia { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Pariente")]
    [GraphQLDescription("Input para crear un Pariente.")]
    public class clCreateParientes
    {
        [GraphQLNonNullType] [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int UsuarioID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("NombrePariente")]
        [GraphQLDescription("NombrePariente")]
        public string NombrePariente { get; set; } = default!;
        [GraphQLNonNullType] [SwaggerSchema("ParentescoID")]
        [GraphQLDescription("ParentescoID")]
        public int ParentescoID { get; set; }
        [SwaggerSchema("TelefonoPariente")]
        [GraphQLDescription("TelefonoPariente")]
        public string? TelefonoPariente { get; set; }
        [SwaggerSchema("CorreoPariente")]
        [GraphQLDescription("CorreoPariente")]
        public string? CorreoPariente { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("EsContactoEmergencia")]
        [GraphQLDescription("EsContactoEmergencia")]
        public bool EsContactoEmergencia { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Pariente")]
    [GraphQLDescription("Input para actualizar parcialmente un Pariente.")]
    public class clUpdateParientes
    {
        [SwaggerSchema("Identificador único del Pariente")]
        [GraphQLDescription("Identificador único del Pariente")]
        public int? ParienteID { get; set; }
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("NombrePariente")]
        [GraphQLDescription("NombrePariente")]
        public string? NombrePariente { get; set; }
        [SwaggerSchema("ParentescoID")]
        [GraphQLDescription("ParentescoID")]
        public int? ParentescoID { get; set; }
        [SwaggerSchema("TelefonoPariente")]
        [GraphQLDescription("TelefonoPariente")]
        public string? TelefonoPariente { get; set; }
        [SwaggerSchema("CorreoPariente")]
        [GraphQLDescription("CorreoPariente")]
        public string? CorreoPariente { get; set; }
        [SwaggerSchema("EsContactoEmergencia")]
        [GraphQLDescription("EsContactoEmergencia")]
        public bool? EsContactoEmergencia { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
