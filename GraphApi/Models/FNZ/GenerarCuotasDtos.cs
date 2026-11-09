using System.Text.Json.Serialization;

namespace GraphApi.Models.FNZ;

public sealed class GenerarCuotasRequest
{
    [JsonPropertyName("anio")]
    public int Anio { get; set; }

    [JsonPropertyName("mes")]
    public int Mes { get; set; }

    [JsonPropertyName("monto")]
    public decimal Monto { get; set; }

    [JsonPropertyName("fechaVencimiento")]
    public DateTime FechaVencimiento { get; set; }

    [JsonPropertyName("cuentaId")]
    public int? CuentaId { get; set; }
}

public sealed class GenerarCuotasResultDto
{
    [JsonPropertyName("creadas")]
    public int Creadas { get; set; }

    [JsonPropertyName("omitidas")]
    public int Omitidas { get; set; }
}

public sealed class CuentaFnzCatalogoDto
{
    [JsonPropertyName("cuentaId")]
    public int CuentaId { get; set; }

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = "";
}

public sealed class CuentaFnzAdminDto
{
    [JsonPropertyName("cuentaId")]
    public int CuentaId { get; set; }

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = "";

    [JsonPropertyName("tipo")]
    public string Tipo { get; set; } = "";

    [JsonPropertyName("saldo")]
    public decimal Saldo { get; set; }

    [JsonPropertyName("responsableUsuarioId")]
    public int? ResponsableUsuarioId { get; set; }
}

public sealed class CuentaFnzUpsertRequest
{
    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = "";

    [JsonPropertyName("tipo")]
    public string Tipo { get; set; } = "";

    [JsonPropertyName("saldo")]
    public decimal Saldo { get; set; }

    [JsonPropertyName("responsableUsuarioId")]
    public int? ResponsableUsuarioId { get; set; }
}

public sealed class TipoCuentaFnzDto
{
    [JsonPropertyName("tipoCuentaId")]
    public int TipoCuentaId { get; set; }

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = "";

    [JsonPropertyName("descripcion")]
    public string? Descripcion { get; set; }
}

public sealed class TipoCuentaFnzUpsertRequest
{
    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = "";

    [JsonPropertyName("descripcion")]
    public string? Descripcion { get; set; }
}

public sealed class TipoMovimientoFnzDto
{
    [JsonPropertyName("tipoMovimientoId")]
    public int TipoMovimientoId { get; set; }

    [JsonPropertyName("tipoMovimiento")]
    public string TipoMovimiento { get; set; } = "";

    [JsonPropertyName("bCargo")]
    public bool BCargo { get; set; }

    [JsonPropertyName("bAbono")]
    public bool BAbono { get; set; }
}

public sealed class TipoMovimientoFnzUpsertRequest
{
    [JsonPropertyName("tipoMovimiento")]
    public string TipoMovimiento { get; set; } = "";

    [JsonPropertyName("bCargo")]
    public bool BCargo { get; set; }

    [JsonPropertyName("bAbono")]
    public bool BAbono { get; set; }
}

public sealed class PeriodoCuotasGeneradoDto
{
    [JsonPropertyName("periodoInicio")]
    public DateTime PeriodoInicio { get; set; }

    [JsonPropertyName("mes")]
    public int Mes { get; set; }

    [JsonPropertyName("anio")]
    public int Anio { get; set; }

    [JsonPropertyName("cuotasGeneradas")]
    public int CuotasGeneradas { get; set; }

    [JsonPropertyName("casas")]
    public int Casas { get; set; }

    [JsonPropertyName("montoUnitario")]
    public decimal MontoUnitario { get; set; }

    [JsonPropertyName("fechaVencimiento")]
    public DateTime FechaVencimiento { get; set; }

    [JsonPropertyName("generadoEn")]
    public DateTime GeneradoEn { get; set; }

    [JsonPropertyName("cuentaNombre")]
    public string? CuentaNombre { get; set; }
}

public sealed class MovimientoFnzDto
{
    [JsonPropertyName("transaccionId")]
    public int TransaccionId { get; set; }

    [JsonPropertyName("cuentaId")]
    public int CuentaId { get; set; }

    [JsonPropertyName("cuentaNombre")]
    public string CuentaNombre { get; set; } = "";

    [JsonPropertyName("tipoMovimiento")]
    public string TipoMovimiento { get; set; } = "";

    [JsonPropertyName("cargo")]
    public decimal? Cargo { get; set; }

    [JsonPropertyName("abono")]
    public decimal? Abono { get; set; }

    [JsonPropertyName("motivo")]
    public string? Motivo { get; set; }

    [JsonPropertyName("fechaCreacion")]
    public DateTime FechaCreacion { get; set; }
}

public sealed class RegistrarMovimientoFnzRequest
{
    [JsonPropertyName("cuentaId")]
    public int CuentaId { get; set; }

    [JsonPropertyName("tipoMovimiento")]
    public string TipoMovimiento { get; set; } = "";

    [JsonPropertyName("monto")]
    public decimal Monto { get; set; }

    [JsonPropertyName("motivo")]
    public string Motivo { get; set; } = "";
}
