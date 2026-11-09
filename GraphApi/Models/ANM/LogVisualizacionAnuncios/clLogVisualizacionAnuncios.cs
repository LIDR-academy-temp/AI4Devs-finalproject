using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.ANM.LogVisualizacionAnuncios
{
    [SwaggerSchema("Modelo de lectura de un LogVisualizacionAnuncio")]
    [GraphQLDescription("Objeto que representa un LogVisualizacionAnuncio existente.")]
    public class clReadLogVisualizacionAnuncios
    {
        [SwaggerSchema("Identificador único del LogVisualizacionAnuncio")]
        [GraphQLDescription("Identificador único del LogVisualizacionAnuncio")]
        public int? LogVisualizacionAnuncioID { get; set; }
        [SwaggerSchema("AnuncioID")]
        [GraphQLDescription("AnuncioID")]
        public int? AnuncioID { get; set; }
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("Medio")]
        [GraphQLDescription("Medio")]
        public string? Medio { get; set; }
        [SwaggerSchema("IPOrigen")]
        [GraphQLDescription("IPOrigen")]
        public string? IPOrigen { get; set; }
        [SwaggerSchema("UserAgent")]
        [GraphQLDescription("UserAgent")]
        public string? UserAgent { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un LogVisualizacionAnuncio")]
    [GraphQLDescription("Input para crear un LogVisualizacionAnuncio.")]
    public class clCreateLogVisualizacionAnuncios
    {
        [GraphQLNonNullType] [SwaggerSchema("AnuncioID")]
        [GraphQLDescription("AnuncioID")]
        public int AnuncioID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int UsuarioID { get; set; }
        [SwaggerSchema("Medio")]
        [GraphQLDescription("Medio")]
        public string? Medio { get; set; }
        [SwaggerSchema("IPOrigen")]
        [GraphQLDescription("IPOrigen")]
        public string? IPOrigen { get; set; }
        [SwaggerSchema("UserAgent")]
        [GraphQLDescription("UserAgent")]
        public string? UserAgent { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un LogVisualizacionAnuncio")]
    [GraphQLDescription("Input para actualizar parcialmente un LogVisualizacionAnuncio.")]
    public class clUpdateLogVisualizacionAnuncios
    {
        [SwaggerSchema("Identificador único del LogVisualizacionAnuncio")]
        [GraphQLDescription("Identificador único del LogVisualizacionAnuncio")]
        public int? LogVisualizacionAnuncioID { get; set; }
        [SwaggerSchema("AnuncioID")]
        [GraphQLDescription("AnuncioID")]
        public int? AnuncioID { get; set; }
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("Medio")]
        [GraphQLDescription("Medio")]
        public string? Medio { get; set; }
        [SwaggerSchema("IPOrigen")]
        [GraphQLDescription("IPOrigen")]
        public string? IPOrigen { get; set; }
        [SwaggerSchema("UserAgent")]
        [GraphQLDescription("UserAgent")]
        public string? UserAgent { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
