using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.SGR.Casas
{
    [SwaggerSchema("Modelo de lectura de un Casa")]
    [GraphQLDescription("Objeto que representa un Casa existente.")]
    public class clReadCasas
    {
        [SwaggerSchema("Identificador único del Casa")]
        [GraphQLDescription("Identificador único del Casa")]
        public int? CasaID { get; set; }
        [SwaggerSchema("CondominioID")]
        [GraphQLDescription("CondominioID")]
        public int? CondominioID { get; set; }
        [SwaggerSchema("NombreCondominio")]
        [GraphQLDescription("NombreCondominio")]
        public string? NombreCondominio { get; set; } = default!;
        [SwaggerSchema("DireccionCondominio")]
        [GraphQLDescription("DireccionCondominio")]
        public string? DireccionCondominio { get; set; }
        [SwaggerSchema("DireccionCasa")]
        [GraphQLDescription("DireccionCasa")]
        public string? DireccionCasa { get; set; }
        [SwaggerSchema("NumeroExtCasa")]
        [GraphQLDescription("NumeroExtCasa")]
        public string? NumeroExtCasa { get; set; }
        [SwaggerSchema("PropietarioUsuarioID")]
        [GraphQLDescription("PropietarioUsuarioID")]
        public int? PropietarioUsuarioID { get; set; }
        [SwaggerSchema("NombrePropietario")]
        [GraphQLDescription("NombrePropietario")]
        public string? NombrePropietario { get; set; } = default!;
        [SwaggerSchema("CorreoPropietario")]
        [GraphQLDescription("CorreoPropietario")]
        public string? CorreoPropietario { get; set; } = default!;
        [SwaggerSchema("FotoUrlPropietario")]
        [GraphQLDescription("FotoUrlPropietario")]
        public string? FotoUrlPropietario { get; set; }
        [SwaggerSchema("TelefonoPropietario")]
        [GraphQLDescription("TelefonoPropietario")]
        public string? TelefonoPropietario { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Casa")]
    [GraphQLDescription("Input para crear un Casa.")]
    public class clCreateCasas
    {
        [GraphQLNonNullType] [SwaggerSchema("CondominioID")]
        [GraphQLDescription("CondominioID")]
        public int CondominioID { get; set; }
        [SwaggerSchema("DireccionCasa")]
        [GraphQLDescription("DireccionCasa")]
        public string? DireccionCasa { get; set; }
        [SwaggerSchema("NumeroExtCasa")]
        [GraphQLDescription("NumeroExtCasa")]
        public string? NumeroExtCasa { get; set; }
        [SwaggerSchema("PropietarioUsuarioID")]
        [GraphQLDescription("PropietarioUsuarioID")]
        public int? PropietarioUsuarioID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Casa")]
    [GraphQLDescription("Input para actualizar parcialmente un Casa.")]
    public class clUpdateCasas
    {
        [SwaggerSchema("Identificador único del Casa")]
        [GraphQLDescription("Identificador único del Casa")]
        public int? CasaID { get; set; }
        [SwaggerSchema("CondominioID")]
        [GraphQLDescription("CondominioID")]
        public int? CondominioID { get; set; }
        [SwaggerSchema("DireccionCasa")]
        [GraphQLDescription("DireccionCasa")]
        public string? DireccionCasa { get; set; }
        [SwaggerSchema("NumeroExtCasa")]
        [GraphQLDescription("NumeroExtCasa")]
        public string? NumeroExtCasa { get; set; }
        [SwaggerSchema("PropietarioUsuarioID")]
        [GraphQLDescription("PropietarioUsuarioID")]
        public int? PropietarioUsuarioID { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
