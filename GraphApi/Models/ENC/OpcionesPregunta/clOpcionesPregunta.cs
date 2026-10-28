using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.ENC.OpcionesPregunta
{
    [SwaggerSchema("Modelo de lectura de un OpcionesPregunta")]
    [GraphQLDescription("Objeto que representa un OpcionesPregunta existente.")]
    public class clReadOpcionesPregunta
    {
        [SwaggerSchema("Identificador único del OpcionesPregunta")]
        [GraphQLDescription("Identificador único del OpcionesPregunta")]
        public int? OpcionPreguntaID { get; set; }
        [SwaggerSchema("PreguntaID")]
        [GraphQLDescription("PreguntaID")]
        public int? PreguntaID { get; set; }
        [SwaggerSchema("Texto")]
        [GraphQLDescription("Texto")]
        public string? Texto { get; set; } = default!;
        [SwaggerSchema("Valor")]
        [GraphQLDescription("Valor")]
        public string? Valor { get; set; }
        [SwaggerSchema("Orden")]
        [GraphQLDescription("Orden")]
        public int? Orden { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un OpcionesPregunta")]
    [GraphQLDescription("Input para crear un OpcionesPregunta.")]
    public class clCreateOpcionesPregunta
    {
        [GraphQLNonNullType] [SwaggerSchema("PreguntaID")]
        [GraphQLDescription("PreguntaID")]
        public int PreguntaID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("Texto")]
        [GraphQLDescription("Texto")]
        public string Texto { get; set; } = default!;
        [SwaggerSchema("Valor")]
        [GraphQLDescription("Valor")]
        public string? Valor { get; set; }
        [SwaggerSchema("Orden")]
        [GraphQLDescription("Orden")]
        public int? Orden { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un OpcionesPregunta")]
    [GraphQLDescription("Input para actualizar parcialmente un OpcionesPregunta.")]
    public class clUpdateOpcionesPregunta
    {
        [SwaggerSchema("Identificador único del OpcionesPregunta")]
        [GraphQLDescription("Identificador único del OpcionesPregunta")]
        public int? OpcionPreguntaID { get; set; }
        [SwaggerSchema("PreguntaID")]
        [GraphQLDescription("PreguntaID")]
        public int? PreguntaID { get; set; }
        [SwaggerSchema("Texto")]
        [GraphQLDescription("Texto")]
        public string? Texto { get; set; }
        [SwaggerSchema("Valor")]
        [GraphQLDescription("Valor")]
        public string? Valor { get; set; }
        [SwaggerSchema("Orden")]
        [GraphQLDescription("Orden")]
        public int? Orden { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
