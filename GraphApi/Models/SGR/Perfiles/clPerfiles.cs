using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.SGR.Perfiles
{
    [SwaggerSchema("Modelo de lectura de un Perfile")]
    [GraphQLDescription("Objeto que representa un Perfile existente.")]
    public class clReadPerfiles
    {
        [SwaggerSchema("Identificador único del Perfile")]
        [GraphQLDescription("Identificador único del Perfile")]
        public int? PerfilID { get; set; }
        [SwaggerSchema("Perfil")]
        [GraphQLDescription("Perfil")]
        public string? Perfil { get; set; } = default!;
        [SwaggerSchema("Descripcion")]
        [GraphQLDescription("Descripcion")]
        public string? Descripcion { get; set; }
        [SwaggerSchema("bAdministrador")]
        [GraphQLDescription("bAdministrador")]
        public bool? bAdministrador { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
        [SwaggerSchema("UsuariosAsignados")]
        [GraphQLDescription("UsuariosAsignados")]
        public int? UsuariosAsignados { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Perfile")]
    [GraphQLDescription("Input para crear un Perfile.")]
    public class clCreatePerfiles
    {
        [GraphQLNonNullType] [SwaggerSchema("Perfil")]
        [GraphQLDescription("Perfil")]
        public string Perfil { get; set; } = default!;
        [SwaggerSchema("Descripcion")]
        [GraphQLDescription("Descripcion")]
        public string? Descripcion { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bAdministrador")]
        [GraphQLDescription("bAdministrador")]
        public bool bAdministrador { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Perfile")]
    [GraphQLDescription("Input para actualizar parcialmente un Perfile.")]
    public class clUpdatePerfiles
    {
        [SwaggerSchema("Identificador único del Perfile")]
        [GraphQLDescription("Identificador único del Perfile")]
        public int? PerfilID { get; set; }
        [SwaggerSchema("Perfil")]
        [GraphQLDescription("Perfil")]
        public string? Perfil { get; set; }
        [SwaggerSchema("Descripcion")]
        [GraphQLDescription("Descripcion")]
        public string? Descripcion { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
        [SwaggerSchema("bAdministrador")]
        [GraphQLDescription("bAdministrador")]
        public bool? bAdministrador { get; set; }
    }
}
