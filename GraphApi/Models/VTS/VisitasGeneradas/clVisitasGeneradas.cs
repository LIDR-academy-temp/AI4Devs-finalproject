using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.VTS.VisitasGeneradas
{
    [SwaggerSchema("Modelo de lectura de un VisitasGenerada")]
    [GraphQLDescription("Objeto que representa un VisitasGenerada existente.")]
    public class clReadVisitasGeneradas
    {
        [SwaggerSchema("Identificador único del VisitasGenerada")]
        [GraphQLDescription("Identificador único del VisitasGenerada")]
        public int? VisitaGeneradaID { get; set; }
        [SwaggerSchema("NombreVisitante")]
        [GraphQLDescription("NombreVisitante")]
        public string? NombreVisitante { get; set; } = default!;
        [SwaggerSchema("UsuarioVisitadoID")]
        [GraphQLDescription("UsuarioVisitadoID")]
        public int? UsuarioVisitadoID { get; set; }
        [SwaggerSchema("NombreVisitado")]
        [GraphQLDescription("NombreVisitado")]
        public string? NombreVisitado { get; set; } = default!;
        [SwaggerSchema("CorreoVisitado")]
        [GraphQLDescription("CorreoVisitado")]
        public string? CorreoVisitado { get; set; } = default!;
        [SwaggerSchema("CasaID")]
        [GraphQLDescription("CasaID")]
        public int? CasaID { get; set; }
        [SwaggerSchema("DireccionCasa")]
        [GraphQLDescription("DireccionCasa")]
        public string? DireccionCasa { get; set; }
        [SwaggerSchema("NumeroExtCasa")]
        [GraphQLDescription("NumeroExtCasa")]
        public string? NumeroExtCasa { get; set; }
        [SwaggerSchema("TipoIdentificacionID")]
        [GraphQLDescription("TipoIdentificacionID")]
        public int? TipoIdentificacionID { get; set; }
        [SwaggerSchema("TipoIdentificacion")]
        [GraphQLDescription("TipoIdentificacion")]
        public string? TipoIdentificacion { get; set; } = default!;
        [SwaggerSchema("NumeroIdentificacion")]
        [GraphQLDescription("NumeroIdentificacion")]
        public string? NumeroIdentificacion { get; set; } = default!;
        [SwaggerSchema("RutaDocumento")]
        [GraphQLDescription("RutaDocumento")]
        public string? RutaDocumento { get; set; }
        [SwaggerSchema("CodigoQR")]
        [GraphQLDescription("CodigoQR")]
        public string? CodigoQR { get; set; }
        [SwaggerSchema("FechaEmision")]
        [GraphQLDescription("FechaEmision")]
        public DateTime? FechaEmision { get; set; }
        [SwaggerSchema("FechaExpira")]
        [GraphQLDescription("FechaExpira")]
        public DateTime? FechaExpira { get; set; }
        [SwaggerSchema("bUsado")]
        [GraphQLDescription("bUsado")]
        public bool? bUsado { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un VisitasGenerada")]
    [GraphQLDescription("Input para crear un VisitasGenerada.")]
    public class clCreateVisitasGeneradas
    {
        [GraphQLNonNullType] [SwaggerSchema("NombreVisitante")]
        [GraphQLDescription("NombreVisitante")]
        public string NombreVisitante { get; set; } = default!;
        [GraphQLNonNullType] [SwaggerSchema("UsuarioVisitadoID")]
        [GraphQLDescription("UsuarioVisitadoID")]
        public int UsuarioVisitadoID { get; set; }
        [SwaggerSchema("CasaID")]
        [GraphQLDescription("CasaID")]
        public int? CasaID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("TipoIdentificacionID")]
        [GraphQLDescription("TipoIdentificacionID")]
        public int TipoIdentificacionID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("NumeroIdentificacion")]
        [GraphQLDescription("NumeroIdentificacion")]
        public string NumeroIdentificacion { get; set; } = default!;
        [SwaggerSchema("RutaDocumento")]
        [GraphQLDescription("RutaDocumento")]
        public string? RutaDocumento { get; set; }
        [SwaggerSchema("CodigoQR")]
        [GraphQLDescription("CodigoQR")]
        public string? CodigoQR { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("FechaEmision")]
        [GraphQLDescription("FechaEmision")]
        public DateTime FechaEmision { get; set; }
        [SwaggerSchema("FechaExpira")]
        [GraphQLDescription("FechaExpira")]
        public DateTime? FechaExpira { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bUsado")]
        [GraphQLDescription("bUsado")]
        public bool bUsado { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
        [SwaggerSchema("Column_20")]
        [GraphQLDescription("Column_20")]
        public int? Column_20 { get; set; }
        [SwaggerSchema("Column_21")]
        [GraphQLDescription("Column_21")]
        public int? Column_21 { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un VisitasGenerada")]
    [GraphQLDescription("Input para actualizar parcialmente un VisitasGenerada.")]
    public class clUpdateVisitasGeneradas
    {
        [SwaggerSchema("Identificador único del VisitasGenerada")]
        [GraphQLDescription("Identificador único del VisitasGenerada")]
        public int? VisitaGeneradaID { get; set; }
        [SwaggerSchema("NombreVisitante")]
        [GraphQLDescription("NombreVisitante")]
        public string? NombreVisitante { get; set; }
        [SwaggerSchema("UsuarioVisitadoID")]
        [GraphQLDescription("UsuarioVisitadoID")]
        public int? UsuarioVisitadoID { get; set; }
        [SwaggerSchema("CasaID")]
        [GraphQLDescription("CasaID")]
        public int? CasaID { get; set; }
        [SwaggerSchema("TipoIdentificacionID")]
        [GraphQLDescription("TipoIdentificacionID")]
        public int? TipoIdentificacionID { get; set; }
        [SwaggerSchema("NumeroIdentificacion")]
        [GraphQLDescription("NumeroIdentificacion")]
        public string? NumeroIdentificacion { get; set; }
        [SwaggerSchema("RutaDocumento")]
        [GraphQLDescription("RutaDocumento")]
        public string? RutaDocumento { get; set; }
        [SwaggerSchema("CodigoQR")]
        [GraphQLDescription("CodigoQR")]
        public string? CodigoQR { get; set; }
        [SwaggerSchema("FechaEmision")]
        [GraphQLDescription("FechaEmision")]
        public DateTime? FechaEmision { get; set; }
        [SwaggerSchema("FechaExpira")]
        [GraphQLDescription("FechaExpira")]
        public DateTime? FechaExpira { get; set; }
        [SwaggerSchema("bUsado")]
        [GraphQLDescription("bUsado")]
        public bool? bUsado { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
        [SwaggerSchema("Column_20")]
        [GraphQLDescription("Column_20")]
        public int? Column_20 { get; set; }
        [SwaggerSchema("Column_21")]
        [GraphQLDescription("Column_21")]
        public int? Column_21 { get; set; }
    }
}
