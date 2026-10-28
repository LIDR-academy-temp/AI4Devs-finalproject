using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.SGR.Condominios
{
    [SwaggerSchema("Modelo de lectura de un Condominio")]
    [GraphQLDescription("Objeto que representa un Condominio existente.")]
    public class clReadCondominios
    {
        [SwaggerSchema("Identificador único del Condominio")]
        [GraphQLDescription("Identificador único del Condominio")]
        public int? CondominioID { get; set; }
        [SwaggerSchema("NombreCondominio")]
        [GraphQLDescription("NombreCondominio")]
        public string? NombreCondominio { get; set; } = default!;
        [SwaggerSchema("DireccionCondominio")]
        [GraphQLDescription("DireccionCondominio")]
        public string? DireccionCondominio { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Condominio")]
    [GraphQLDescription("Input para crear un Condominio.")]
    public class clCreateCondominios
    {
        [GraphQLNonNullType] [SwaggerSchema("NombreCondominio")]
        [GraphQLDescription("NombreCondominio")]
        public string NombreCondominio { get; set; } = default!;
        [SwaggerSchema("DireccionCondominio")]
        [GraphQLDescription("DireccionCondominio")]
        public string? DireccionCondominio { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Condominio")]
    [GraphQLDescription("Input para actualizar parcialmente un Condominio.")]
    public class clUpdateCondominios
    {
        [SwaggerSchema("Identificador único del Condominio")]
        [GraphQLDescription("Identificador único del Condominio")]
        public int? CondominioID { get; set; }
        [SwaggerSchema("NombreCondominio")]
        [GraphQLDescription("NombreCondominio")]
        public string? NombreCondominio { get; set; }
        [SwaggerSchema("DireccionCondominio")]
        [GraphQLDescription("DireccionCondominio")]
        public string? DireccionCondominio { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
