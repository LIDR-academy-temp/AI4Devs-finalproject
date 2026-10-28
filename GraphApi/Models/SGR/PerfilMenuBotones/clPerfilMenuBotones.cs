using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.SGR.PerfilMenuBotones
{
    [SwaggerSchema("Modelo de lectura de un PerfilMenuBotone")]
    [GraphQLDescription("Objeto que representa un PerfilMenuBotone existente.")]
    public class clReadPerfilMenuBotones
    {
        [SwaggerSchema("Identificador único del PerfilMenuBotone")]
        [GraphQLDescription("Identificador único del PerfilMenuBotone")]
        public int? PerfilMenuBotonID { get; set; }
        [SwaggerSchema("PerfilID")]
        [GraphQLDescription("PerfilID")]
        public int? PerfilID { get; set; }
        [SwaggerSchema("Perfil")]
        [GraphQLDescription("Perfil")]
        public string? Perfil { get; set; } = default!;
        [SwaggerSchema("MenuBotonID")]
        [GraphQLDescription("MenuBotonID")]
        public int? MenuBotonID { get; set; }
        [SwaggerSchema("Boton")]
        [GraphQLDescription("Boton")]
        public string? Boton { get; set; } = default!;
        [SwaggerSchema("Accion")]
        [GraphQLDescription("Accion")]
        public string? Accion { get; set; }
        [SwaggerSchema("MenuID")]
        [GraphQLDescription("MenuID")]
        public int? MenuID { get; set; }
        [SwaggerSchema("TituloMenu")]
        [GraphQLDescription("TituloMenu")]
        public string? TituloMenu { get; set; } = default!;
        [SwaggerSchema("bActivo")]
        [GraphQLDescription("bActivo")]
        public bool? bActivo { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un PerfilMenuBotone")]
    [GraphQLDescription("Input para crear un PerfilMenuBotone.")]
    public class clCreatePerfilMenuBotones
    {
        [GraphQLNonNullType] [SwaggerSchema("PerfilID")]
        [GraphQLDescription("PerfilID")]
        public int PerfilID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("MenuBotonID")]
        [GraphQLDescription("MenuBotonID")]
        public int MenuBotonID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bActivo")]
        [GraphQLDescription("bActivo")]
        public bool bActivo { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un PerfilMenuBotone")]
    [GraphQLDescription("Input para actualizar parcialmente un PerfilMenuBotone.")]
    public class clUpdatePerfilMenuBotones
    {
        [SwaggerSchema("Identificador único del PerfilMenuBotone")]
        [GraphQLDescription("Identificador único del PerfilMenuBotone")]
        public int? PerfilMenuBotonID { get; set; }
        [SwaggerSchema("PerfilID")]
        [GraphQLDescription("PerfilID")]
        public int? PerfilID { get; set; }
        [SwaggerSchema("MenuBotonID")]
        [GraphQLDescription("MenuBotonID")]
        public int? MenuBotonID { get; set; }
        [SwaggerSchema("bActivo")]
        [GraphQLDescription("bActivo")]
        public bool? bActivo { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
