using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.VTS.AreasComunes
{
    [SwaggerSchema("Modelo de lectura de un AreasComune")]
    [GraphQLDescription("Objeto que representa un AreasComune existente.")]
    public class clReadAreasComunes
    {
        [SwaggerSchema("Identificador único del AreasComune")]
        [GraphQLDescription("Identificador único del AreasComune")]
        public int? AreasComunesID { get; set; }
        [SwaggerSchema("AreasComunes")]
        [GraphQLDescription("AreasComunes")]
        public string? AreasComunes { get; set; } = default!;
        [SwaggerSchema("DescripcionAreasComunes")]
        [GraphQLDescription("DescripcionAreasComunes")]
        public string? DescripcionAreasComunes { get; set; }
        [SwaggerSchema("Capacidad")]
        [GraphQLDescription("Capacidad")]
        public int? Capacidad { get; set; }
        [SwaggerSchema("RequiereReservacion")]
        [GraphQLDescription("RequiereReservacion")]
        public bool? RequiereReservacion { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un AreasComune")]
    [GraphQLDescription("Input para crear un AreasComune.")]
    public class clCreateAreasComunes
    {
        [GraphQLNonNullType] [SwaggerSchema("AreasComunes")]
        [GraphQLDescription("AreasComunes")]
        public string AreasComunes { get; set; } = default!;
        [SwaggerSchema("DescripcionAreasComunes")]
        [GraphQLDescription("DescripcionAreasComunes")]
        public string? DescripcionAreasComunes { get; set; }
        [SwaggerSchema("Capacidad")]
        [GraphQLDescription("Capacidad")]
        public int? Capacidad { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("RequiereReservacion")]
        [GraphQLDescription("RequiereReservacion")]
        public bool RequiereReservacion { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un AreasComune")]
    [GraphQLDescription("Input para actualizar parcialmente un AreasComune.")]
    public class clUpdateAreasComunes
    {
        [SwaggerSchema("Identificador único del AreasComune")]
        [GraphQLDescription("Identificador único del AreasComune")]
        public int? AreasComunesID { get; set; }
        [SwaggerSchema("AreasComunes")]
        [GraphQLDescription("AreasComunes")]
        public string? AreasComunes { get; set; }
        [SwaggerSchema("DescripcionAreasComunes")]
        [GraphQLDescription("DescripcionAreasComunes")]
        public string? DescripcionAreasComunes { get; set; }
        [SwaggerSchema("Capacidad")]
        [GraphQLDescription("Capacidad")]
        public int? Capacidad { get; set; }
        [SwaggerSchema("RequiereReservacion")]
        [GraphQLDescription("RequiereReservacion")]
        public bool? RequiereReservacion { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
