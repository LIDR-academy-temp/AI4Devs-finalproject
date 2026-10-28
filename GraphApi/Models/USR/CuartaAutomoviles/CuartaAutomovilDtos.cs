namespace GraphApi.Models.USR.CuartaAutomoviles;

public sealed class AutomovilListItemDto
{
    public int AutomovilId { get; init; }
    public int UsuarioId { get; init; }
    public string? NombreUsuario { get; init; }
    public string? CorreoUsuario { get; init; }
    public int? MarcaId { get; init; }
    public string? Marca { get; init; }
    public int? ModeloId { get; init; }
    public string? Modelo { get; init; }
    public string? ModeloLibre { get; init; }
    public string? Placas { get; init; }
    public string? Color { get; init; }
    public string? NumeroCasa { get; init; }
}

public sealed class MarcaDto
{
    public int MarcaId { get; init; }
    public string Marca { get; init; } = "";
}

public sealed class ModeloDto
{
    public int ModeloId { get; init; }
    public string Modelo { get; init; } = "";
    public int MarcaId { get; init; }
}

public sealed class AutomovilCrearRequest
{
    public int? MarcaId { get; init; }
    public int? ModeloId { get; init; }
    public string? ModeloLibre { get; init; }
    public string Placas { get; init; } = "";
    public string? Color { get; init; }
}

/// <summary>Alta de vehículo por administrador (propietario explícito).</summary>
public sealed class AutomovilCrearAdminRequest
{
    public int UsuarioId { get; init; }
    public int? MarcaId { get; init; }
    public int? ModeloId { get; init; }
    public string? ModeloLibre { get; init; }
    public string Placas { get; init; } = "";
    public string? Color { get; init; }
}

public sealed class AutomovilActualizarRequest
{
    public int? MarcaId { get; init; }
    public int? ModeloId { get; init; }
    public string? ModeloLibre { get; init; }
    public string? Placas { get; init; }
    public string? Color { get; init; }
}
