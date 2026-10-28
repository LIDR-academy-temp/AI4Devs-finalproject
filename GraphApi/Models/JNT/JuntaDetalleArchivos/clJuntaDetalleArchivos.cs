using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.JNT.JuntaDetalleArchivos
{
    [SwaggerSchema("Modelo de lectura de un JuntaDetalleArchivo")]
    [GraphQLDescription("Objeto que representa un JuntaDetalleArchivo existente.")]
    public class clReadJuntaDetalleArchivos
    {
        [SwaggerSchema("Identificador único del JuntaDetalleArchivo")]
        [GraphQLDescription("Identificador único del JuntaDetalleArchivo")]
        public int? JuntaDetalleArchivoID { get; set; }
        [SwaggerSchema("JuntaDetalleID")]
        [GraphQLDescription("JuntaDetalleID")]
        public int? JuntaDetalleID { get; set; }
        [SwaggerSchema("NombreArchivo")]
        [GraphQLDescription("NombreArchivo")]
        public string? NombreArchivo { get; set; } = default!;
        [SwaggerSchema("Ruta")]
        [GraphQLDescription("Ruta")]
        public string? Ruta { get; set; } = default!;
        [SwaggerSchema("TipoArchivo")]
        [GraphQLDescription("TipoArchivo")]
        public string? TipoArchivo { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un JuntaDetalleArchivo")]
    [GraphQLDescription("Input para crear un JuntaDetalleArchivo.")]
    public class clCreateJuntaDetalleArchivos
    {
        [GraphQLNonNullType] [SwaggerSchema("JuntaDetalleID")]
        [GraphQLDescription("JuntaDetalleID")]
        public int JuntaDetalleID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("NombreArchivo")]
        [GraphQLDescription("NombreArchivo")]
        public string NombreArchivo { get; set; } = default!;
        [GraphQLNonNullType] [SwaggerSchema("Ruta")]
        [GraphQLDescription("Ruta")]
        public string Ruta { get; set; } = default!;
        [SwaggerSchema("TipoArchivo")]
        [GraphQLDescription("TipoArchivo")]
        public string? TipoArchivo { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un JuntaDetalleArchivo")]
    [GraphQLDescription("Input para actualizar parcialmente un JuntaDetalleArchivo.")]
    public class clUpdateJuntaDetalleArchivos
    {
        [SwaggerSchema("Identificador único del JuntaDetalleArchivo")]
        [GraphQLDescription("Identificador único del JuntaDetalleArchivo")]
        public int? JuntaDetalleArchivoID { get; set; }
        [SwaggerSchema("JuntaDetalleID")]
        [GraphQLDescription("JuntaDetalleID")]
        public int? JuntaDetalleID { get; set; }
        [SwaggerSchema("NombreArchivo")]
        [GraphQLDescription("NombreArchivo")]
        public string? NombreArchivo { get; set; }
        [SwaggerSchema("Ruta")]
        [GraphQLDescription("Ruta")]
        public string? Ruta { get; set; }
        [SwaggerSchema("TipoArchivo")]
        [GraphQLDescription("TipoArchivo")]
        public string? TipoArchivo { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
