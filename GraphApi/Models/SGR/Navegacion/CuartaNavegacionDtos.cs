using System.Text.Json.Serialization;

namespace GraphApi.Models.SGR.Navegacion;

public sealed class MenuNodoDto
{
    [JsonPropertyName("menuId")]
    public int MenuId { get; set; }

    [JsonPropertyName("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [JsonPropertyName("ruta")]
    public string? Ruta { get; set; }

    [JsonPropertyName("icono")]
    public string? Icono { get; set; }

    [JsonPropertyName("orden")]
    public int Orden { get; set; }

    [JsonPropertyName("hijos")]
    public IReadOnlyList<MenuNodoDto> Hijos { get; set; } = Array.Empty<MenuNodoDto>();
}

public sealed class MenuAdminListItemDto
{
    [JsonPropertyName("menuId")]
    public int MenuId { get; set; }

    [JsonPropertyName("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [JsonPropertyName("ruta")]
    public string? Ruta { get; set; }

    [JsonPropertyName("icono")]
    public string? Icono { get; set; }

    [JsonPropertyName("orden")]
    public int Orden { get; set; }

    [JsonPropertyName("padreMenuId")]
    public int? PadreMenuId { get; set; }

    [JsonPropertyName("eliminado")]
    public bool Eliminado { get; set; }
}

public sealed class MenuCrearRequest
{
    [JsonPropertyName("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [JsonPropertyName("ruta")]
    public string? Ruta { get; set; }

    [JsonPropertyName("icono")]
    public string? Icono { get; set; }

    [JsonPropertyName("orden")]
    public int Orden { get; set; }

    [JsonPropertyName("padreMenuId")]
    public int? PadreMenuId { get; set; }
}

public sealed class MenuActualizarRequest
{
    [JsonPropertyName("titulo")]
    public string? Titulo { get; set; }

    [JsonPropertyName("ruta")]
    public string? Ruta { get; set; }

    [JsonPropertyName("icono")]
    public string? Icono { get; set; }

    [JsonPropertyName("orden")]
    public int? Orden { get; set; }

    [JsonPropertyName("padreMenuId")]
    public int? PadreMenuId { get; set; }
}

public sealed class PerfilMenuPermisoDto
{
    [JsonPropertyName("menuId")]
    public int MenuId { get; set; }

    [JsonPropertyName("titulo")]
    public string Titulo { get; set; } = string.Empty;

    [JsonPropertyName("visible")]
    public bool Visible { get; set; }

    [JsonPropertyName("asignado")]
    public bool Asignado { get; set; }
}

public sealed class PerfilMenuAsignacionItemRequest
{
    [JsonPropertyName("menuId")]
    public int MenuId { get; set; }

    [JsonPropertyName("visible")]
    public bool Visible { get; set; } = true;
}

public sealed class PerfilMenuAsignacionRequest
{
    [JsonPropertyName("menus")]
    public IReadOnlyList<PerfilMenuAsignacionItemRequest> Menus { get; set; } =
        Array.Empty<PerfilMenuAsignacionItemRequest>();
}

public sealed class PerfilAdminListItemDto
{
    [JsonPropertyName("perfilId")]
    public int PerfilId { get; set; }

    [JsonPropertyName("nombre")]
    public string Nombre { get; set; } = string.Empty;

    [JsonPropertyName("descripcion")]
    public string? Descripcion { get; set; }

    [JsonPropertyName("bAdministrador")]
    public bool BAdministrador { get; set; }
}

public sealed class MenuPerfilRow
{
    public int MenuId { get; set; }
    public string TituloMenu { get; set; } = string.Empty;
    public string? Ruta { get; set; }
    public string? Icono { get; set; }
    public int Orden { get; set; }
    public int? PadreMenuId { get; set; }
}
