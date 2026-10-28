using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.USR.Automoviles
{
    [SwaggerSchema("Modelo de lectura de un Automovile")]
    [GraphQLDescription("Objeto que representa un Automovile existente.")]
    public class clReadAutomoviles
    {
        [SwaggerSchema("Identificador único del Automovile")]
        [GraphQLDescription("Identificador único del Automovile")]
        public int? AutomovilID { get; set; }
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("NombreUsuario")]
        [GraphQLDescription("NombreUsuario")]
        public string? NombreUsuario { get; set; } = default!;
        [SwaggerSchema("CorreoUsuario")]
        [GraphQLDescription("CorreoUsuario")]
        public string? CorreoUsuario { get; set; } = default!;
        [SwaggerSchema("MarcaID")]
        [GraphQLDescription("MarcaID")]
        public int? MarcaID { get; set; }
        [SwaggerSchema("Marca")]
        [GraphQLDescription("Marca")]
        public string? Marca { get; set; } = default!;
        [SwaggerSchema("ModeloID")]
        [GraphQLDescription("ModeloID")]
        public int? ModeloID { get; set; }
        [SwaggerSchema("ModeloLibre")]
        [GraphQLDescription("ModeloLibre (valor libre introducido por usuario)")]
        public string? ModeloLibre { get; set; } = default!;
        [SwaggerSchema("Modelo")]
        [GraphQLDescription("Modelo")]
        public string? Modelo { get; set; } = default!;
        [SwaggerSchema("Placas")]
        [GraphQLDescription("Placas")]
        public string? Placas { get; set; }
        [SwaggerSchema("Color")]
        [GraphQLDescription("Color")]
        public string? Color { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Automovile")]
    [GraphQLDescription("Input para crear un Automovile.")]
    public class clCreateAutomoviles
    {
        [GraphQLNonNullType] [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int UsuarioID { get; set; }
        [SwaggerSchema("MarcaID")]
        [GraphQLDescription("MarcaID")]
        public int? MarcaID { get; set; }
        [SwaggerSchema("ModeloID")]
        [GraphQLDescription("ModeloID")]
        public int? ModeloID { get; set; }
        [SwaggerSchema("ModeloLibre")]
        [GraphQLDescription("ModeloLibre (valor libre introducido por usuario)")]
        public string? ModeloLibre { get; set; }
        [SwaggerSchema("Placas")]
        [GraphQLDescription("Placas")]
        public string? Placas { get; set; }
        [SwaggerSchema("Color")]
        [GraphQLDescription("Color")]
        public string? Color { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Automovile")]
    [GraphQLDescription("Input para actualizar parcialmente un Automovile.")]
    public class clUpdateAutomoviles
    {
        [SwaggerSchema("Identificador único del Automovile")]
        [GraphQLDescription("Identificador único del Automovile")]
        public int? AutomovilID { get; set; }
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("MarcaID")]
        [GraphQLDescription("MarcaID")]
        public int? MarcaID { get; set; }
        [SwaggerSchema("ModeloID")]
        [GraphQLDescription("ModeloID")]
        public int? ModeloID { get; set; }
        [SwaggerSchema("ModeloLibre")]
        [GraphQLDescription("ModeloLibre (valor libre introducido por usuario)")]
        public string? ModeloLibre { get; set; }
        [SwaggerSchema("Placas")]
        [GraphQLDescription("Placas")]
        public string? Placas { get; set; }
        [SwaggerSchema("Color")]
        [GraphQLDescription("Color")]
        public string? Color { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
