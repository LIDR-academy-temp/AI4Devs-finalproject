using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.VTS.LogUsoVisitas
{
    [SwaggerSchema("Modelo de lectura de un LogUsoVisita")]
    [GraphQLDescription("Objeto que representa un LogUsoVisita existente.")]
    public class clReadLogUsoVisitas
    {
        [SwaggerSchema("Identificador único del LogUsoVisita")]
        [GraphQLDescription("Identificador único del LogUsoVisita")]
        public int? LogUsoVisitaID { get; set; }
        [SwaggerSchema("VisitaGeneradaID")]
        [GraphQLDescription("VisitaGeneradaID")]
        public int? VisitaGeneradaID { get; set; }
        [SwaggerSchema("FechaAcceso")]
        [GraphQLDescription("FechaAcceso")]
        public DateTime? FechaAcceso { get; set; }
        [SwaggerSchema("IPOrigen")]
        [GraphQLDescription("IPOrigen")]
        public string? IPOrigen { get; set; }
        [SwaggerSchema("UserAgent")]
        [GraphQLDescription("UserAgent")]
        public string? UserAgent { get; set; }
        [SwaggerSchema("Exitoso")]
        [GraphQLDescription("Exitoso")]
        public bool? Exitoso { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un LogUsoVisita")]
    [GraphQLDescription("Input para crear un LogUsoVisita.")]
    public class clCreateLogUsoVisitas
    {
        [GraphQLNonNullType] [SwaggerSchema("VisitaGeneradaID")]
        [GraphQLDescription("VisitaGeneradaID")]
        public int VisitaGeneradaID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("FechaAcceso")]
        [GraphQLDescription("FechaAcceso")]
        public DateTime FechaAcceso { get; set; }
        [SwaggerSchema("IPOrigen")]
        [GraphQLDescription("IPOrigen")]
        public string? IPOrigen { get; set; }
        [SwaggerSchema("UserAgent")]
        [GraphQLDescription("UserAgent")]
        public string? UserAgent { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("Exitoso")]
        [GraphQLDescription("Exitoso")]
        public bool Exitoso { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un LogUsoVisita")]
    [GraphQLDescription("Input para actualizar parcialmente un LogUsoVisita.")]
    public class clUpdateLogUsoVisitas
    {
        [SwaggerSchema("Identificador único del LogUsoVisita")]
        [GraphQLDescription("Identificador único del LogUsoVisita")]
        public int? LogUsoVisitaID { get; set; }
        [SwaggerSchema("VisitaGeneradaID")]
        [GraphQLDescription("VisitaGeneradaID")]
        public int? VisitaGeneradaID { get; set; }
        [SwaggerSchema("FechaAcceso")]
        [GraphQLDescription("FechaAcceso")]
        public DateTime? FechaAcceso { get; set; }
        [SwaggerSchema("IPOrigen")]
        [GraphQLDescription("IPOrigen")]
        public string? IPOrigen { get; set; }
        [SwaggerSchema("UserAgent")]
        [GraphQLDescription("UserAgent")]
        public string? UserAgent { get; set; }
        [SwaggerSchema("Exitoso")]
        [GraphQLDescription("Exitoso")]
        public bool? Exitoso { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
