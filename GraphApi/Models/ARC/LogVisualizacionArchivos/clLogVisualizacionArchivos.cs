using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.ARC.LogVisualizacionArchivos
{
    [SwaggerSchema("Modelo de lectura de un LogVisualizacionArchivo")]
    [GraphQLDescription("Objeto que representa un LogVisualizacionArchivo existente.")]
    public class clReadLogVisualizacionArchivos
    {
        [SwaggerSchema("Identificador único del LogVisualizacionArchivo")]
        [GraphQLDescription("Identificador único del LogVisualizacionArchivo")]
        public int? LogVisualizacionArchivoID { get; set; }
        [SwaggerSchema("ArchivoID")]
        [GraphQLDescription("ArchivoID")]
        public int? ArchivoID { get; set; }
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

    [SwaggerSchema("Modelo de creación de un LogVisualizacionArchivo")]
    [GraphQLDescription("Input para crear un LogVisualizacionArchivo.")]
    public class clCreateLogVisualizacionArchivos
    {
        [GraphQLNonNullType] [SwaggerSchema("ArchivoID")]
        [GraphQLDescription("ArchivoID")]
        public int ArchivoID { get; set; }
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

    [SwaggerSchema("Modelo de actualización de un LogVisualizacionArchivo")]
    [GraphQLDescription("Input para actualizar parcialmente un LogVisualizacionArchivo.")]
    public class clUpdateLogVisualizacionArchivos
    {
        [SwaggerSchema("Identificador único del LogVisualizacionArchivo")]
        [GraphQLDescription("Identificador único del LogVisualizacionArchivo")]
        public int? LogVisualizacionArchivoID { get; set; }
        [SwaggerSchema("ArchivoID")]
        [GraphQLDescription("ArchivoID")]
        public int? ArchivoID { get; set; }
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
