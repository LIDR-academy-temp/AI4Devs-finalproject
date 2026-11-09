using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.SGR.PerfilMenus
{
    [SwaggerSchema("Modelo de lectura de un PerfilMenu")]
    [GraphQLDescription("Objeto que representa un PerfilMenu existente.")]
    public class clReadPerfilMenus
    {
        [SwaggerSchema("Identificador único del PerfilMenu")]
        [GraphQLDescription("Identificador único del PerfilMenu")]
        public int? PerfilMenuID { get; set; }
        [SwaggerSchema("PerfilID")]
        [GraphQLDescription("PerfilID")]
        public int? PerfilID { get; set; }
        [SwaggerSchema("Perfil")]
        [GraphQLDescription("Perfil")]
        public string? Perfil { get; set; } = default!;
        [SwaggerSchema("MenuID")]
        [GraphQLDescription("MenuID")]
        public int? MenuID { get; set; }
        [SwaggerSchema("TituloMenu")]
        [GraphQLDescription("TituloMenu")]
        public string? TituloMenu { get; set; } = default!;
        [SwaggerSchema("Icono")]
        [GraphQLDescription("Icono")]
        public string? Icono { get; set; }
        [SwaggerSchema("Ruta")]
        [GraphQLDescription("Ruta")]
        public string? Ruta { get; set; }
        [SwaggerSchema("Orden")]
        [GraphQLDescription("Orden")]
        public int? Orden { get; set; }
        [SwaggerSchema("PadreMenuID")]
        [GraphQLDescription("PadreMenuID")]
        public int? PadreMenuID { get; set; }
        [SwaggerSchema("bVisible")]
        [GraphQLDescription("bVisible")]
        public bool? bVisible { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un PerfilMenu")]
    [GraphQLDescription("Input para crear un PerfilMenu.")]
    public class clCreatePerfilMenus
    {
        [GraphQLNonNullType] [SwaggerSchema("PerfilID")]
        [GraphQLDescription("PerfilID")]
        public int PerfilID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("MenuID")]
        [GraphQLDescription("MenuID")]
        public int MenuID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bVisible")]
        [GraphQLDescription("bVisible")]
        public bool bVisible { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un PerfilMenu")]
    [GraphQLDescription("Input para actualizar parcialmente un PerfilMenu.")]
    public class clUpdatePerfilMenus
    {
        [SwaggerSchema("Identificador único del PerfilMenu")]
        [GraphQLDescription("Identificador único del PerfilMenu")]
        public int? PerfilMenuID { get; set; }
        [SwaggerSchema("PerfilID")]
        [GraphQLDescription("PerfilID")]
        public int? PerfilID { get; set; }
        [SwaggerSchema("MenuID")]
        [GraphQLDescription("MenuID")]
        public int? MenuID { get; set; }
        [SwaggerSchema("bVisible")]
        [GraphQLDescription("bVisible")]
        public bool? bVisible { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
