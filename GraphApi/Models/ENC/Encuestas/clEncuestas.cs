using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.ENC.Encuestas
{
    [SwaggerSchema("Modelo de lectura de un Encuesta")]
    [GraphQLDescription("Objeto que representa un Encuesta existente.")]
    public class clReadEncuestas
    {
        [SwaggerSchema("Identificador único del Encuesta")]
        [GraphQLDescription("Identificador único del Encuesta")]
        public int? EncuestaID { get; set; }
        [SwaggerSchema("Titulo")]
        [GraphQLDescription("Titulo")]
        public string? Titulo { get; set; } = default!;
        [SwaggerSchema("Descripcion")]
        [GraphQLDescription("Descripcion")]
        public string? Descripcion { get; set; }
        [SwaggerSchema("FechaInicio")]
        [GraphQLDescription("FechaInicio")]
        public DateTime? FechaInicio { get; set; }
        [SwaggerSchema("FechaFin")]
        [GraphQLDescription("FechaFin")]
        public DateTime? FechaFin { get; set; }
        [SwaggerSchema("bActivo")]
        [GraphQLDescription("bActivo")]
        public bool? bActivo { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Encuesta")]
    [GraphQLDescription("Input para crear un Encuesta.")]
    public class clCreateEncuestas
    {
        [GraphQLNonNullType] [SwaggerSchema("Titulo")]
        [GraphQLDescription("Titulo")]
        public string Titulo { get; set; } = default!;
        [SwaggerSchema("Descripcion")]
        [GraphQLDescription("Descripcion")]
        public string? Descripcion { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("FechaInicio")]
        [GraphQLDescription("FechaInicio")]
        public DateTime FechaInicio { get; set; }
        [SwaggerSchema("FechaFin")]
        [GraphQLDescription("FechaFin")]
        public DateTime? FechaFin { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bActivo")]
        [GraphQLDescription("bActivo")]
        public bool bActivo { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Encuesta")]
    [GraphQLDescription("Input para actualizar parcialmente un Encuesta.")]
    public class clUpdateEncuestas
    {
        [SwaggerSchema("Identificador único del Encuesta")]
        [GraphQLDescription("Identificador único del Encuesta")]
        public int? EncuestaID { get; set; }
        [SwaggerSchema("Titulo")]
        [GraphQLDescription("Titulo")]
        public string? Titulo { get; set; }
        [SwaggerSchema("Descripcion")]
        [GraphQLDescription("Descripcion")]
        public string? Descripcion { get; set; }
        [SwaggerSchema("FechaInicio")]
        [GraphQLDescription("FechaInicio")]
        public DateTime? FechaInicio { get; set; }
        [SwaggerSchema("FechaFin")]
        [GraphQLDescription("FechaFin")]
        public DateTime? FechaFin { get; set; }
        [SwaggerSchema("bActivo")]
        [GraphQLDescription("bActivo")]
        public bool? bActivo { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
