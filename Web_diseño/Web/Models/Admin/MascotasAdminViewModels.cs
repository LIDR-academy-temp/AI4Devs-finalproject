using System.Collections.Generic;

namespace Web.Models.Admin
{
    public sealed class MascotaAdminViewModel
    {
        public int? MascotaID { get; set; }
        public int? UsuarioID { get; set; }
        public string NombreUsuario { get; set; } = string.Empty;
        public string DireccionCondomino { get; set; } = string.Empty;
        public string NombreMascota { get; set; } = string.Empty;
        public string RazaLibre { get; set; } = string.Empty;
        public bool bEliminado { get; set; }
    }

    public sealed class MascotaAdminFormViewModel
    {
        public int? MascotaID { get; set; }
        public int? UsuarioID { get; set; }
        public string NombreMascota { get; set; } = string.Empty;
        public string RazaLibre { get; set; } = string.Empty;
    }

    public sealed class MascotasAdminPageViewModel
    {
        public IReadOnlyList<MascotaAdminViewModel> Items { get; set; } = Array.Empty<MascotaAdminViewModel>();
        public IReadOnlyList<UsuarioLookupViewModel> Usuarios { get; set; } = Array.Empty<UsuarioLookupViewModel>();
        public MascotaAdminFormViewModel Form { get; set; } = new();
        public string? Message { get; set; }
        public string? Error { get; set; }
    }
}