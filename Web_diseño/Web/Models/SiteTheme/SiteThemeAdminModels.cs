namespace Web.Models.SiteTheme;

public sealed class SiteThemeAdminPageViewModel
{
    public string ConfigPath { get; set; } = string.Empty;
    public string DefaultTheme { get; set; } = "ocean";
    public bool AllowUserSwitch { get; set; } = true;
    public SiteThemeFonts Fonts { get; set; } = new();
    public IReadOnlyList<SiteThemeAdminThemeCardViewModel> Themes { get; set; } = Array.Empty<SiteThemeAdminThemeCardViewModel>();
    public string? Message { get; set; }
    public string? Error { get; set; }
}

public sealed class SiteThemeAdminThemeCardViewModel
{
    public string Id { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public string MetaThemeColor { get; set; } = "#043b44";
    public string PrimaryColor { get; set; } = "#043b44";
    public string AccentColor { get; set; } = "#f84a36";
    public string SidebarColor { get; set; } = "#14263d";
    public string BgColor { get; set; } = "#f3f7fc";
    public bool IsDefault { get; set; }
}

public sealed class SiteThemeAdminSaveViewModel
{
    public string DefaultTheme { get; set; } = "ocean";
    public bool AllowUserSwitch { get; set; } = true;
    public string GoogleFontsUrl { get; set; } = string.Empty;
    public string FontBody { get; set; } = "Inter, sans-serif";
    public string FontHeading { get; set; } = "Inter, sans-serif";
}

public sealed class SiteThemeAdminSaveTokensViewModel
{
    public string ThemeId { get; set; } = "ocean";
    public string MetaThemeColor { get; set; } = "#043b44";
    public string PrimaryColor { get; set; } = "#043b44";
    public string AccentColor { get; set; } = "#f84a36";
    public string SidebarColor { get; set; } = "#14263d";
    public string BgColor { get; set; } = "#f3f7fc";
}
