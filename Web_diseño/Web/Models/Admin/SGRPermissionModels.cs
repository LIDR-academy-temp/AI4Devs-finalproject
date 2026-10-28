namespace Web.Models.Admin;

public sealed class PerfilMenuItemViewModel
{
    public int MenuID { get; set; }
    public string TituloMenu { get; set; } = string.Empty;
    public string? Ruta { get; set; }
    public string? Icono { get; set; }
    public int Orden { get; set; }
    public int? PadreMenuID { get; set; }
    public bool bVisible { get; set; }
    public List<PerfilMenuItemViewModel> Children { get; set; } = new();
}

public sealed class PerfilMenuBotonItemViewModel
{
    public int MenuBotonID { get; set; }
    public int MenuID { get; set; }
    public string Boton { get; set; } = string.Empty;
    public string Accion { get; set; } = string.Empty;
    public bool bActivo { get; set; }
}

public sealed class PermissionCacheEntry
{
    public IReadOnlyList<PerfilMenuItemViewModel> Menus { get; set; } = Array.Empty<PerfilMenuItemViewModel>();
    public IReadOnlyList<PerfilMenuBotonItemViewModel> Botones { get; set; } = Array.Empty<PerfilMenuBotonItemViewModel>();
}

// ─── Admin SGR ViewModels ────────────────────────────────────────────────────

public sealed class SgrPerfilFormViewModel
{
    public int? PerfilID { get; set; }
    public string Perfil { get; set; } = string.Empty;
    public bool bAdministrador { get; set; }
    public bool bEliminado { get; set; }
}

public sealed class SgrPerfilesPageViewModel
{
    public IReadOnlyList<SgrPerfilFormViewModel> Items { get; set; } = Array.Empty<SgrPerfilFormViewModel>();
    public SgrPerfilFormViewModel Form { get; set; } = new();
    public string? Message { get; set; }
    public string? Error { get; set; }
}

public sealed class SgrMenuViewModel
{
    public int MenuID { get; set; }
    public string TituloMenu { get; set; } = string.Empty;
    public int? PadreMenuID { get; set; }
    public int Orden { get; set; }
}

public sealed class SgrMenuBotonViewModel
{
    public int MenuBotonID { get; set; }
    public int MenuID { get; set; }
    public string Boton { get; set; } = string.Empty;
    public string Accion { get; set; } = string.Empty;
}

public sealed class PerfilPermisoMenuViewModel
{
    public int MenuID { get; set; }
    public string TituloMenu { get; set; } = string.Empty;
    public int? PadreMenuID { get; set; }
    public int Orden { get; set; }
    public bool bVisible { get; set; }
}

public sealed class PerfilPermisoBotonesViewModel
{
    public int MenuBotonID { get; set; }
    public int MenuID { get; set; }
    public string Boton { get; set; } = string.Empty;
    public string Accion { get; set; } = string.Empty;
    public bool bActivo { get; set; }
}

public sealed class PerfilPermisosPageViewModel
{
    public int PerfilID { get; set; }
    public string NombrePerfil { get; set; } = string.Empty;
    public IReadOnlyList<PerfilPermisoMenuViewModel> Menus { get; set; } = Array.Empty<PerfilPermisoMenuViewModel>();
    public IReadOnlyList<PerfilPermisoBotonesViewModel> Botones { get; set; } = Array.Empty<PerfilPermisoBotonesViewModel>();
    public IReadOnlyList<SgrPerfilFormViewModel> Perfiles { get; set; } = Array.Empty<SgrPerfilFormViewModel>();
    public IReadOnlyList<SgrMenuViewModel> MenusDisponibles { get; set; } = Array.Empty<SgrMenuViewModel>();
    public string? Message { get; set; }
    public string? Error { get; set; }
}

public sealed class SgrUsuarioFormViewModel
{
    public int? UsuarioID { get; set; }
    public string Nombre { get; set; } = string.Empty;
    public string Correo { get; set; } = string.Empty;
    public int? PerfilID { get; set; }
    public bool bActivo { get; set; } = true;
    public string? Telefono { get; set; }
    public string? FotoUrl { get; set; }
}

public sealed class SgrMenuAdminViewModel
{
    public int? MenuID { get; set; }
    public string TituloMenu { get; set; } = string.Empty;
    public string? Ruta { get; set; }
    public string? Icono { get; set; }
    public int Orden { get; set; }
    public int? PadreMenuID { get; set; }
    public bool bEliminado { get; set; }
}

public sealed class SgrMenusAdminPageViewModel
{
    public IReadOnlyList<SgrMenuAdminViewModel> Items { get; set; } = Array.Empty<SgrMenuAdminViewModel>();
    public SgrMenuAdminViewModel Form { get; set; } = new();
    public string? Message { get; set; }
    public string? Error { get; set; }
}

public sealed class SgrUsuariosPageViewModel
{
    public IReadOnlyList<SgrUsuarioFormViewModel> Items { get; set; } = Array.Empty<SgrUsuarioFormViewModel>();
    public SgrUsuarioFormViewModel Form { get; set; } = new();
    public IReadOnlyList<SgrPerfilFormViewModel> Perfiles { get; set; } = Array.Empty<SgrPerfilFormViewModel>();
    public string? Message { get; set; }
    public string? Error { get; set; }
}

