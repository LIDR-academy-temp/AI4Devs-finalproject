using System.Collections.Generic;

namespace Web.Models.Admin
{
    public sealed class ResidenteAdminViewModel
    {
        public int? UsuarioID { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Correo { get; set; } = string.Empty;
        public string DireccionCondomino { get; set; } = string.Empty;
        public bool bActivo { get; set; }
        public IReadOnlyList<CasaAdminViewModel> Casas { get; set; } = Array.Empty<CasaAdminViewModel>();
    }

    public sealed class CasaAdminViewModel
    {
        public int? CasaID { get; set; }
        public int? CondominioID { get; set; }
        public string NombreCondominio { get; set; } = string.Empty;
        public string DireccionCasa { get; set; } = string.Empty;
        public string NumeroExtCasa { get; set; } = string.Empty;
        public int? PropietarioUsuarioID { get; set; }
        public bool bEliminado { get; set; }
    }

    public sealed class ResidenteAdminFormViewModel
    {
        public int? UsuarioID { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string Correo { get; set; } = string.Empty;
        public bool bActivo { get; set; }

        // Para casa (si editando casa)
        public int? CasaID { get; set; }
        public string DireccionCasa { get; set; } = string.Empty;
        public string NumeroExtCasa { get; set; } = string.Empty;
    }

    public sealed class ResidentesAdminPageViewModel
    {
        public IReadOnlyList<ResidenteAdminViewModel> Items { get; set; } = Array.Empty<ResidenteAdminViewModel>();
        public ResidenteAdminFormViewModel Form { get; set; } = new();
        public string? Message { get; set; }
        public string? Error { get; set; }
    }
}