using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.SGR.MenusBotones
{
    [SwaggerSchema("Modelo de lectura de un MenusBotone")]
    [GraphQLDescription("Objeto que representa un MenusBotone existente.")]
    public class clReadMenusBotones
    {
        [SwaggerSchema("Identificador único del MenusBotone")]
        [GraphQLDescription("Identificador único del MenusBotone")]
        public int? MenuBotonID { get; set; }
        [SwaggerSchema("MenuID")]
        [GraphQLDescription("MenuID")]
        public int? MenuID { get; set; }
        [SwaggerSchema("TituloMenu")]
        [GraphQLDescription("TituloMenu")]
        public string? TituloMenu { get; set; } = default!;
        [SwaggerSchema("Boton")]
        [GraphQLDescription("Boton")]
        public string? Boton { get; set; } = default!;
        [SwaggerSchema("Accion")]
        [GraphQLDescription("Accion")]
        public string? Accion { get; set; }
        [SwaggerSchema("Orden")]
        [GraphQLDescription("Orden")]
        public int? Orden { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un MenusBotone")]
    [GraphQLDescription("Input para crear un MenusBotone.")]
    public class clCreateMenusBotones
    {
        [GraphQLNonNullType] [SwaggerSchema("MenuID")]
        [GraphQLDescription("MenuID")]
        public int MenuID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("Boton")]
        [GraphQLDescription("Boton")]
        public string Boton { get; set; } = default!;
        [SwaggerSchema("Accion")]
        [GraphQLDescription("Accion")]
        public string? Accion { get; set; }
        [SwaggerSchema("Icono")]
        [GraphQLDescription("Icono")]
        public string? Icono { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("Orden")]
        [GraphQLDescription("Orden")]
        public int Orden { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un MenusBotone")]
    [GraphQLDescription("Input para actualizar parcialmente un MenusBotone.")]
    public class clUpdateMenusBotones
    {
        [SwaggerSchema("Identificador único del MenusBotone")]
        [GraphQLDescription("Identificador único del MenusBotone")]
        public int? MenuBotonID { get; set; }
        [SwaggerSchema("MenuID")]
        [GraphQLDescription("MenuID")]
        public int? MenuID { get; set; }
        [SwaggerSchema("Boton")]
        [GraphQLDescription("Boton")]
        public string? Boton { get; set; }
        [SwaggerSchema("Accion")]
        [GraphQLDescription("Accion")]
        public string? Accion { get; set; }
        [SwaggerSchema("Icono")]
        [GraphQLDescription("Icono")]
        public string? Icono { get; set; }
        [SwaggerSchema("Orden")]
        [GraphQLDescription("Orden")]
        public int? Orden { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
