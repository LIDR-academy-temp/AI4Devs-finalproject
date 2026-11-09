using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.JNT.Juntas
{
    [SwaggerSchema("Modelo de lectura de un Junta")]
    [GraphQLDescription("Objeto que representa un Junta existente.")]
    public class clReadJuntas
    {
        [SwaggerSchema("Identificador único del Junta")]
        [GraphQLDescription("Identificador único del Junta")]
        public int? JuntaID { get; set; }
        [SwaggerSchema("Titulo")]
        [GraphQLDescription("Titulo")]
        public string? Titulo { get; set; } = default!;
        [SwaggerSchema("Descripcion")]
        [GraphQLDescription("Descripcion")]
        public string? Descripcion { get; set; }
        [SwaggerSchema("FechaProgramada")]
        [GraphQLDescription("FechaProgramada")]
        public DateTime? FechaProgramada { get; set; }
        [SwaggerSchema("Ubicacion")]
        [GraphQLDescription("Ubicacion")]
        public string? Ubicacion { get; set; }
        [SwaggerSchema("bActivo")]
        [GraphQLDescription("bActivo")]
        public bool? bActivo { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Junta")]
    [GraphQLDescription("Input para crear un Junta.")]
    public class clCreateJuntas
    {
        [GraphQLNonNullType] [SwaggerSchema("Titulo")]
        [GraphQLDescription("Titulo")]
        public string Titulo { get; set; } = default!;
        [SwaggerSchema("Descripcion")]
        [GraphQLDescription("Descripcion")]
        public string? Descripcion { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("FechaProgramada")]
        [GraphQLDescription("FechaProgramada")]
        public DateTime FechaProgramada { get; set; }
        [SwaggerSchema("Ubicacion")]
        [GraphQLDescription("Ubicacion")]
        public string? Ubicacion { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bActivo")]
        [GraphQLDescription("bActivo")]
        public bool bActivo { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Junta")]
    [GraphQLDescription("Input para actualizar parcialmente un Junta.")]
    public class clUpdateJuntas
    {
        [SwaggerSchema("Identificador único del Junta")]
        [GraphQLDescription("Identificador único del Junta")]
        public int? JuntaID { get; set; }
        [SwaggerSchema("Titulo")]
        [GraphQLDescription("Titulo")]
        public string? Titulo { get; set; }
        [SwaggerSchema("Descripcion")]
        [GraphQLDescription("Descripcion")]
        public string? Descripcion { get; set; }
        [SwaggerSchema("FechaProgramada")]
        [GraphQLDescription("FechaProgramada")]
        public DateTime? FechaProgramada { get; set; }
        [SwaggerSchema("Ubicacion")]
        [GraphQLDescription("Ubicacion")]
        public string? Ubicacion { get; set; }
        [SwaggerSchema("bActivo")]
        [GraphQLDescription("bActivo")]
        public bool? bActivo { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
