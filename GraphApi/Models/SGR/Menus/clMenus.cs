using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.SGR.Menus
{
    [SwaggerSchema("Modelo de lectura de un Menu")]
    [GraphQLDescription("Objeto que representa un Menu existente.")]
    public class clReadMenus
    {
        [SwaggerSchema("Identificador único del Menu")]
        [GraphQLDescription("Identificador único del Menu")]
        public int? MenuID { get; set; }
        [SwaggerSchema("TituloMenu")]
        [GraphQLDescription("TituloMenu")]
        public string? TituloMenu { get; set; } = default!;
        [SwaggerSchema("Ruta")]
        [GraphQLDescription("Ruta")]
        public string? Ruta { get; set; }
        [SwaggerSchema("Icono")]
        [GraphQLDescription("Icono")]
        public string? Icono { get; set; }
        [SwaggerSchema("Orden")]
        [GraphQLDescription("Orden")]
        public int? Orden { get; set; }
        [SwaggerSchema("PadreMenuID")]
        [GraphQLDescription("PadreMenuID")]
        public int? PadreMenuID { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Menu")]
    [GraphQLDescription("Input para crear un Menu.")]
    public class clCreateMenus
    {
        [GraphQLNonNullType] [SwaggerSchema("TituloMenu")]
        [GraphQLDescription("TituloMenu")]
        public string TituloMenu { get; set; } = default!;
        [SwaggerSchema("Ruta")]
        [GraphQLDescription("Ruta")]
        public string? Ruta { get; set; }
        [SwaggerSchema("Icono")]
        [GraphQLDescription("Icono")]
        public string? Icono { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("Orden")]
        [GraphQLDescription("Orden")]
        public int Orden { get; set; }
        [SwaggerSchema("PadreMenuID")]
        [GraphQLDescription("PadreMenuID")]
        public int? PadreMenuID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Menu")]
    [GraphQLDescription("Input para actualizar parcialmente un Menu.")]
    public class clUpdateMenus
    {
        [SwaggerSchema("Identificador único del Menu")]
        [GraphQLDescription("Identificador único del Menu")]
        public int? MenuID { get; set; }
        [SwaggerSchema("TituloMenu")]
        [GraphQLDescription("TituloMenu")]
        public string? TituloMenu { get; set; }
        [SwaggerSchema("Ruta")]
        [GraphQLDescription("Ruta")]
        public string? Ruta { get; set; }
        [SwaggerSchema("Icono")]
        [GraphQLDescription("Icono")]
        public string? Icono { get; set; }
        [SwaggerSchema("Orden")]
        [GraphQLDescription("Orden")]
        public int? Orden { get; set; }
        [SwaggerSchema("PadreMenuID")]
        [GraphQLDescription("PadreMenuID")]
        public int? PadreMenuID { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
