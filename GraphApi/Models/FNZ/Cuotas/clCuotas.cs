using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.FNZ.Cuotas
{
    [SwaggerSchema("Modelo de lectura de un Cuota")]
    [GraphQLDescription("Objeto que representa un Cuota existente.")]
    public class clReadCuotas
    {
        [SwaggerSchema("Identificador único del Cuota")]
        [GraphQLDescription("Identificador único del Cuota")]
        public int? CuotaID { get; set; }
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("CasaID")]
        [GraphQLDescription("CasaID")]
        public int? CasaID { get; set; }
        [SwaggerSchema("Monto")]
        [GraphQLDescription("Monto")]
        public decimal? Monto { get; set; }
        [SwaggerSchema("PeriodoInicio")]
        [GraphQLDescription("PeriodoInicio")]
        public DateTime? PeriodoInicio { get; set; }
        [SwaggerSchema("PeriodoFin")]
        [GraphQLDescription("PeriodoFin")]
        public DateTime? PeriodoFin { get; set; }
        [SwaggerSchema("FechaVencimiento")]
        [GraphQLDescription("FechaVencimiento")]
        public DateTime? FechaVencimiento { get; set; }
        [SwaggerSchema("Pagado")]
        [GraphQLDescription("Pagado")]
        public bool? Pagado { get; set; }
        [SwaggerSchema("FechaPago")]
        [GraphQLDescription("FechaPago")]
        public DateTime? FechaPago { get; set; }
        [SwaggerSchema("MetodoPago")]
        [GraphQLDescription("MetodoPago")]
        public string? MetodoPago { get; set; }
        [SwaggerSchema("ReferenciaPago")]
        [GraphQLDescription("ReferenciaPago")]
        public string? ReferenciaPago { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Cuota")]
    [GraphQLDescription("Input para crear un Cuota.")]
    public class clCreateCuotas
    {
        [GraphQLNonNullType] [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int UsuarioID { get; set; }
        [SwaggerSchema("CasaID")]
        [GraphQLDescription("CasaID")]
        public int? CasaID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("Monto")]
        [GraphQLDescription("Monto")]
        public decimal Monto { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("PeriodoInicio")]
        [GraphQLDescription("PeriodoInicio")]
        public DateTime PeriodoInicio { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("PeriodoFin")]
        [GraphQLDescription("PeriodoFin")]
        public DateTime PeriodoFin { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("FechaVencimiento")]
        [GraphQLDescription("FechaVencimiento")]
        public DateTime FechaVencimiento { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("Pagado")]
        [GraphQLDescription("Pagado")]
        public bool Pagado { get; set; }
        [SwaggerSchema("FechaPago")]
        [GraphQLDescription("FechaPago")]
        public DateTime? FechaPago { get; set; }
        [SwaggerSchema("MetodoPago")]
        [GraphQLDescription("MetodoPago")]
        public string? MetodoPago { get; set; }
        [SwaggerSchema("ReferenciaPago")]
        [GraphQLDescription("ReferenciaPago")]
        public string? ReferenciaPago { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Cuota")]
    [GraphQLDescription("Input para actualizar parcialmente un Cuota.")]
    public class clUpdateCuotas
    {
        [SwaggerSchema("Identificador único del Cuota")]
        [GraphQLDescription("Identificador único del Cuota")]
        public int? CuotaID { get; set; }
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("CasaID")]
        [GraphQLDescription("CasaID")]
        public int? CasaID { get; set; }
        [SwaggerSchema("Monto")]
        [GraphQLDescription("Monto")]
        public decimal? Monto { get; set; }
        [SwaggerSchema("PeriodoInicio")]
        [GraphQLDescription("PeriodoInicio")]
        public DateTime? PeriodoInicio { get; set; }
        [SwaggerSchema("PeriodoFin")]
        [GraphQLDescription("PeriodoFin")]
        public DateTime? PeriodoFin { get; set; }
        [SwaggerSchema("FechaVencimiento")]
        [GraphQLDescription("FechaVencimiento")]
        public DateTime? FechaVencimiento { get; set; }
        [SwaggerSchema("Pagado")]
        [GraphQLDescription("Pagado")]
        public bool? Pagado { get; set; }
        [SwaggerSchema("FechaPago")]
        [GraphQLDescription("FechaPago")]
        public DateTime? FechaPago { get; set; }
        [SwaggerSchema("MetodoPago")]
        [GraphQLDescription("MetodoPago")]
        public string? MetodoPago { get; set; }
        [SwaggerSchema("ReferenciaPago")]
        [GraphQLDescription("ReferenciaPago")]
        public string? ReferenciaPago { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
