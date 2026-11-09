using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.ENC.Respuestas
{
    [SwaggerSchema("Modelo de lectura de un Respuesta")]
    [GraphQLDescription("Objeto que representa un Respuesta existente.")]
    public class clReadRespuestas
    {
        [SwaggerSchema("Identificador único del Respuesta")]
        [GraphQLDescription("Identificador único del Respuesta")]
        public int? RespuestaID { get; set; }
        [SwaggerSchema("EncuestaID")]
        [GraphQLDescription("EncuestaID")]
        public int? EncuestaID { get; set; }
        [SwaggerSchema("PreguntaID")]
        [GraphQLDescription("PreguntaID")]
        public int? PreguntaID { get; set; }
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("OpcionPreguntaID")]
        [GraphQLDescription("OpcionPreguntaID")]
        public int? OpcionPreguntaID { get; set; }
        [SwaggerSchema("RespuestaTexto")]
        [GraphQLDescription("RespuestaTexto")]
        public string? RespuestaTexto { get; set; }
        [SwaggerSchema("FechaRespuesta")]
        [GraphQLDescription("FechaRespuesta")]
        public DateTime? FechaRespuesta { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Respuesta")]
    [GraphQLDescription("Input para crear un Respuesta.")]
    public class clCreateRespuestas
    {
        [GraphQLNonNullType] [SwaggerSchema("EncuestaID")]
        [GraphQLDescription("EncuestaID")]
        public int EncuestaID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("PreguntaID")]
        [GraphQLDescription("PreguntaID")]
        public int PreguntaID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int UsuarioID { get; set; }
        [SwaggerSchema("OpcionPreguntaID")]
        [GraphQLDescription("OpcionPreguntaID")]
        public int? OpcionPreguntaID { get; set; }
        [SwaggerSchema("RespuestaTexto")]
        [GraphQLDescription("RespuestaTexto")]
        public string? RespuestaTexto { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("FechaRespuesta")]
        [GraphQLDescription("FechaRespuesta")]
        public DateTime FechaRespuesta { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Respuesta")]
    [GraphQLDescription("Input para actualizar parcialmente un Respuesta.")]
    public class clUpdateRespuestas
    {
        [SwaggerSchema("Identificador único del Respuesta")]
        [GraphQLDescription("Identificador único del Respuesta")]
        public int? RespuestaID { get; set; }
        [SwaggerSchema("EncuestaID")]
        [GraphQLDescription("EncuestaID")]
        public int? EncuestaID { get; set; }
        [SwaggerSchema("PreguntaID")]
        [GraphQLDescription("PreguntaID")]
        public int? PreguntaID { get; set; }
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("OpcionPreguntaID")]
        [GraphQLDescription("OpcionPreguntaID")]
        public int? OpcionPreguntaID { get; set; }
        [SwaggerSchema("RespuestaTexto")]
        [GraphQLDescription("RespuestaTexto")]
        public string? RespuestaTexto { get; set; }
        [SwaggerSchema("FechaRespuesta")]
        [GraphQLDescription("FechaRespuesta")]
        public DateTime? FechaRespuesta { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
