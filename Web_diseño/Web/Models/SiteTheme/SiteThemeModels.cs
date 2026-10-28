using System.Text.Json.Serialization;

namespace Web.Models.SiteTheme;

public sealed class SiteThemeConfig
{
    [JsonPropertyName("$comment")]
    public string? Comment { get; set; }

    [JsonPropertyName("defaultTheme")]
    public string DefaultTheme { get; set; } = "ocean";

    [JsonPropertyName("allowUserSwitch")]
    public bool AllowUserSwitch { get; set; } = true;

    [JsonPropertyName("fonts")]
    public SiteThemeFonts Fonts { get; set; } = new();

    [JsonPropertyName("themes")]
    public Dictionary<string, SiteThemeDefinition> Themes { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class SiteThemeFonts
{
    [JsonPropertyName("googleFontsUrl")]
    public string GoogleFontsUrl { get; set; } = string.Empty;

    [JsonPropertyName("body")]
    public string Body { get; set; } = "Inter, sans-serif";

    [JsonPropertyName("heading")]
    public string Heading { get; set; } = "Inter, sans-serif";
}

public sealed class SiteThemeDefinition
{
    [JsonPropertyName("label")]
    public string Label { get; set; } = string.Empty;

    [JsonPropertyName("metaThemeColor")]
    public string MetaThemeColor { get; set; } = "#043b44";

    [JsonPropertyName("tokens")]
    public Dictionary<string, string> Tokens { get; set; } = new();
}

public sealed class SiteThemeClientConfig
{
    public string DefaultTheme { get; set; } = "ocean";
    public bool AllowUserSwitch { get; set; } = true;
    public SiteThemeFonts Fonts { get; set; } = new();
    public Dictionary<string, SiteThemeClientTheme> Themes { get; set; } = new(StringComparer.OrdinalIgnoreCase);
}

public sealed class SiteThemeClientTheme
{
    public string Label { get; set; } = string.Empty;
    public string MetaThemeColor { get; set; } = "#043b44";
    public Dictionary<string, string> Tokens { get; set; } = new();
}
