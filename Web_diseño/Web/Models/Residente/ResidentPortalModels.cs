using Web.Models.Admin;

namespace Web.Models.Residente
{
    public sealed class ResidentPropertyOptionViewModel
    {
        public int CondominioId { get; set; }
        public string CondominioName { get; set; } = string.Empty;
        public int CasaId { get; set; }
        public string CasaLabel { get; set; } = string.Empty;
        public string? CondominioAddress { get; set; }
        public string DisplayLabel => string.IsNullOrWhiteSpace(CondominioName)
            ? CasaLabel
            : $"{CondominioName} · {CasaLabel}";
    }

    public sealed class ResidentPortalContextViewModel
    {
        public int UsuarioId { get; set; }
        public bool IsAdministrador { get; set; }
        public bool IsResident { get; set; }
        public IReadOnlyList<ResidentPropertyOptionViewModel> Properties { get; set; } = Array.Empty<ResidentPropertyOptionViewModel>();
        public int? SelectedCondominioId { get; set; }
        public string SelectedCondominioName { get; set; } = string.Empty;
        public int? SelectedCasaId { get; set; }
        public string? SelectedCasaLabel { get; set; }
        public bool RequiresPropertySelection { get; set; }
        public string? StatusTitle { get; set; }
        public string? StatusMessage { get; set; }

        public bool HasAssignedProperties => Properties.Count > 0;
        public bool HasActiveProperty => SelectedCondominioId.HasValue && SelectedCasaId.HasValue;

        public string SelectedPropertyDisplay => HasActiveProperty
            ? $"{SelectedCondominioName} · {SelectedCasaLabel}"
            : "Sin vivienda activa";
    }

    public sealed class ResidentShellBadgeViewModel
    {
        public string Label { get; set; } = string.Empty;
        public int Count { get; set; }
        public string Icon { get; set; } = string.Empty;
        public string ToneClass { get; set; } = "primary";
        public string? Href { get; set; }
    }

    public sealed class ResidentMenuViewModel
    {
        public IReadOnlyList<PerfilMenuItemViewModel> PermissionMenus { get; set; } = Array.Empty<PerfilMenuItemViewModel>();
        public ResidentPortalContextViewModel? ResidentContext { get; set; }
        public IReadOnlyList<ResidentShellBadgeViewModel> Badges { get; set; } = Array.Empty<ResidentShellBadgeViewModel>();

        public bool ShowResidentSection => ResidentContext?.IsResident == true;
    }

    public sealed class ResidentAccessPageViewModel
    {
        public ResidentPortalContextViewModel Context { get; set; } = new();
        public string? ReturnUrl { get; set; }
        public string? Message { get; set; }
        public string? Error { get; set; }
    }

    public sealed class ResidentHomePageViewModel
    {
        public ResidentPortalContextViewModel Context { get; set; } = new();
        public IReadOnlyList<ResidentShellBadgeViewModel> Badges { get; set; } = Array.Empty<ResidentShellBadgeViewModel>();
        public int PendingSurveys { get; set; }
        public string? Message { get; set; }
        public string? Error { get; set; }
    }
}