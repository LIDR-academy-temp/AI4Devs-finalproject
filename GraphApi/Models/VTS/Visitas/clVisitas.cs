using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.VTS.Visitas
{
    [SwaggerSchema("Modelo de lectura de un Visita")]
    [GraphQLDescription("Objeto que representa un Visita existente.")]
    public class clReadVisitas
    {
        [SwaggerSchema("Identificador único del Visita")]
        [GraphQLDescription("Identificador único del Visita")]
        public int? VisitaID { get; set; }
        [SwaggerSchema("VisitanteNombre")]
        [GraphQLDescription("VisitanteNombre")]
        public string? VisitanteNombre { get; set; } = default!;
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
        public string? NumeroIdentificacion { get; set; } = default!;
        [SwaggerSchema("RutaDocumento")]
        [GraphQLDescription("RutaDocumento")]
        public string? RutaDocumento { get; set; }
        [SwaggerSchema("FechaEntrada")]
        [GraphQLDescription("FechaEntrada")]
        public DateTime? FechaEntrada { get; set; }
        [SwaggerSchema("FechaSalida")]
        [GraphQLDescription("FechaSalida")]
        public DateTime? FechaSalida { get; set; }
        [SwaggerSchema("Autorizado")]
        [GraphQLDescription("Autorizado")]
        public bool? Autorizado { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Visita")]
    [GraphQLDescription("Input para crear un Visita.")]
    public class clCreateVisitas
    {
        [GraphQLNonNullType] [SwaggerSchema("VisitanteNombre")]
        [GraphQLDescription("VisitanteNombre")]
        public string VisitanteNombre { get; set; } = default!;
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
        [GraphQLNonNullType] [SwaggerSchema("FechaEntrada")]
        [GraphQLDescription("FechaEntrada")]
        public DateTime FechaEntrada { get; set; }
        [SwaggerSchema("FechaSalida")]
        [GraphQLDescription("FechaSalida")]
        public DateTime? FechaSalida { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("Autorizado")]
        [GraphQLDescription("Autorizado")]
        public bool Autorizado { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Visita")]
    [GraphQLDescription("Input para actualizar parcialmente un Visita.")]
    public class clUpdateVisitas
    {
        [SwaggerSchema("Identificador único del Visita")]
        [GraphQLDescription("Identificador único del Visita")]
        public int? VisitaID { get; set; }
        [SwaggerSchema("VisitanteNombre")]
        [GraphQLDescription("VisitanteNombre")]
        public string? VisitanteNombre { get; set; }
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
        [SwaggerSchema("FechaEntrada")]
        [GraphQLDescription("FechaEntrada")]
        public DateTime? FechaEntrada { get; set; }
        [SwaggerSchema("FechaSalida")]
        [GraphQLDescription("FechaSalida")]
        public DateTime? FechaSalida { get; set; }
        [SwaggerSchema("Autorizado")]
        [GraphQLDescription("Autorizado")]
        public bool? Autorizado { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
