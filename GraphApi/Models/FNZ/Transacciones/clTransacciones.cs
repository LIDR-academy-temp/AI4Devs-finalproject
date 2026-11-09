using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.FNZ.Transacciones
{
    [SwaggerSchema("Modelo de lectura de un Transaccione")]
    [GraphQLDescription("Objeto que representa un Transaccione existente.")]
    public class clReadTransacciones
    {
        [SwaggerSchema("Identificador único del Transaccione")]
        [GraphQLDescription("Identificador único del Transaccione")]
        public int? TransaccionID { get; set; }
        [SwaggerSchema("CuentaID")]
        [GraphQLDescription("CuentaID")]
        public int? CuentaID { get; set; }
        [SwaggerSchema("Cuenta")]
        [GraphQLDescription("Cuenta")]
        public string? Cuenta { get; set; } = default!;
        [SwaggerSchema("TipoCuenta")]
        [GraphQLDescription("TipoCuenta")]
        public string? TipoCuenta { get; set; } = default!;
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("NombreUsuario")]
        [GraphQLDescription("NombreUsuario")]
        public string? NombreUsuario { get; set; } = default!;
        [SwaggerSchema("TipoMovimientoID")]
        [GraphQLDescription("TipoMovimientoID")]
        public int? TipoMovimientoID { get; set; }
        [SwaggerSchema("TipoMovimiento")]
        [GraphQLDescription("TipoMovimiento")]
        public string? TipoMovimiento { get; set; } = default!;
        [SwaggerSchema("Cargo")]
        [GraphQLDescription("Cargo")]
        public decimal? Cargo { get; set; }
        [SwaggerSchema("Abono")]
        [GraphQLDescription("Abono")]
        public decimal? Abono { get; set; }
        [SwaggerSchema("Motivo")]
        [GraphQLDescription("Motivo")]
        public string? Motivo { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Transaccione")]
    [GraphQLDescription("Input para crear un Transaccione.")]
    public class clCreateTransacciones
    {
        [GraphQLNonNullType] [SwaggerSchema("CuentaID")]
        [GraphQLDescription("CuentaID")]
        public int CuentaID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int UsuarioID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("TipoMovimientoID")]
        [GraphQLDescription("TipoMovimientoID")]
        public int TipoMovimientoID { get; set; }
        [SwaggerSchema("Cargo")]
        [GraphQLDescription("Cargo")]
        public decimal? Cargo { get; set; }
        [SwaggerSchema("Abono")]
        [GraphQLDescription("Abono")]
        public decimal? Abono { get; set; }
        [SwaggerSchema("Motivo")]
        [GraphQLDescription("Motivo")]
        public string? Motivo { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Transaccione")]
    [GraphQLDescription("Input para actualizar parcialmente un Transaccione.")]
    public class clUpdateTransacciones
    {
        [SwaggerSchema("Identificador único del Transaccione")]
        [GraphQLDescription("Identificador único del Transaccione")]
        public int? TransaccionID { get; set; }
        [SwaggerSchema("CuentaID")]
        [GraphQLDescription("CuentaID")]
        public int? CuentaID { get; set; }
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("TipoMovimientoID")]
        [GraphQLDescription("TipoMovimientoID")]
        public int? TipoMovimientoID { get; set; }
        [SwaggerSchema("Cargo")]
        [GraphQLDescription("Cargo")]
        public decimal? Cargo { get; set; }
        [SwaggerSchema("Abono")]
        [GraphQLDescription("Abono")]
        public decimal? Abono { get; set; }
        [SwaggerSchema("Motivo")]
        [GraphQLDescription("Motivo")]
        public string? Motivo { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
