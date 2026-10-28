using System.Collections.Generic;

namespace Web.Models.Admin
{
    public sealed class AutomovilAdminViewModel
    {
        public int? AutomovilID { get; set; }
        public int? UsuarioID { get; set; }
        public string NombreUsuario { get; set; } = string.Empty;
        public string DireccionCondomino { get; set; } = string.Empty;
        public string ModeloLibre { get; set; } = string.Empty;
        public string Placas { get; set; } = string.Empty;
        public bool bEliminado { get; set; }
    }

    public sealed class AutomovilAdminFormViewModel
    {
        public int? AutomovilID { get; set; }
        public int? UsuarioID { get; set; }
        public string ModeloLibre { get; set; } = string.Empty;
        public string Placas { get; set; } = string.Empty;
    }

    public sealed class AutomovilesAdminPageViewModel
    {
        public IReadOnlyList<AutomovilAdminViewModel> Items { get; set; } = Array.Empty<AutomovilAdminViewModel>();
        public IReadOnlyList<UsuarioLookupViewModel> Usuarios { get; set; } = Array.Empty<UsuarioLookupViewModel>();
        public AutomovilAdminFormViewModel Form { get; set; } = new();
        public string? Message { get; set; }
        public string? Error { get; set; }
    }
}