using System.Text.Json;
using Microsoft.Extensions.Caching.Memory;
using Web.Models.SiteTheme;

namespace Web.Services;

public sealed class SiteThemeService : ISiteThemeService
{
    private static readonly JsonSerializerOptions JsonOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = false
    };

    private static readonly JsonSerializerOptions JsonWriteOptions = new()
    {
        PropertyNamingPolicy = JsonNamingPolicy.CamelCase,
        WriteIndented = true
    };

    private readonly IWebHostEnvironment _environment;
    private readonly IConfiguration _configuration;
    private readonly IMemoryCache _cache;

    public SiteThemeService(
        IWebHostEnvironment environment,
        IConfiguration configuration,
        IMemoryCache cache)
    {
        _environment = environment;
        _configuration = configuration;
        _cache = cache;
    }

    public SiteThemeConfig GetConfig()
    {
        return _cache.GetOrCreate("site-theme-config", entry =>
        {
            entry.SetAbsoluteExpiration(TimeSpan.FromMinutes(5));
            return LoadConfig();
        })!;
    }

    public string GetClientJson()
    {
        var config = GetConfig();
        var client = new SiteThemeClientConfig
        {
            DefaultTheme = ResolveDefaultThemeId(config),
            AllowUserSwitch = config.AllowUserSwitch,
            Fonts = config.Fonts,
            Themes = config.Themes.ToDictionary(
                pair => pair.Key,
                pair => new SiteThemeClientTheme
                {
                    Label = pair.Value.Label,
                    MetaThemeColor = pair.Value.MetaThemeColor,
                    Tokens = pair.Value.Tokens
                },
                StringComparer.OrdinalIgnoreCase)
        };

        return JsonSerializer.Serialize(client, JsonOptions);
    }

    public string GetDefaultThemeId()
    {
        return ResolveDefaultThemeId(GetConfig());
    }

    public string GetMetaThemeColor(string? themeId = null)
    {
        var config = GetConfig();
        var resolvedThemeId = ResolveThemeId(config, themeId ?? ResolveDefaultThemeId(config));
        return config.Themes.TryGetValue(resolvedThemeId, out var theme)
            ? theme.MetaThemeColor
            : "#043b44";
    }

    public string GetConfigRelativePath()
    {
        return _configuration["SiteTheme:ConfigPath"] ?? "config/cq-site-theme.json";
    }

    public void SaveSettings(SiteThemeAdminSaveViewModel model)
    {
        var config = LoadConfigFromDisk();
        var themeId = ResolveThemeId(config, model.DefaultTheme);

        config.DefaultTheme = themeId;
        config.AllowUserSwitch = model.AllowUserSwitch;
        config.Fonts.GoogleFontsUrl = model.GoogleFontsUrl.Trim();
        config.Fonts.Body = model.FontBody.Trim();
        config.Fonts.Heading = model.FontHeading.Trim();
        config.Comment ??= "Archivo maestro de templates del portal. Cambia defaultTheme o edita tokens de un tema para aplicar el estilo a todo el sitio.";

        WriteConfig(config);
        InvalidateCache();
    }

    public void SaveThemeTokens(SiteThemeAdminSaveTokensViewModel model)
    {
        var config = LoadConfigFromDisk();
        var themeId = ResolveThemeId(config, model.ThemeId);

        if (!config.Themes.TryGetValue(themeId, out var theme))
        {
            throw new InvalidOperationException($"No existe el template '{model.ThemeId}'.");
        }

        theme.MetaThemeColor = model.MetaThemeColor.Trim();
        SetToken(theme, "--cq-primary", model.PrimaryColor);
        SetToken(theme, "--cq-accent", model.AccentColor);
        SetToken(theme, "--cq-sidebar-bg", model.SidebarColor);
        SetToken(theme, "--cq-bg", model.BgColor);
        SetToken(theme, "--color-primary", model.PrimaryColor);
        SetToken(theme, "--color-accent", model.AccentColor);

        WriteConfig(config);
        InvalidateCache();
    }

    private static void SetToken(SiteThemeDefinition theme, string key, string value)
    {
        if (string.IsNullOrWhiteSpace(value))
        {
            return;
        }

        theme.Tokens[key] = value.Trim();
    }

    public void InvalidateCache()
    {
        _cache.Remove("site-theme-config");
    }

    private SiteThemeConfig LoadConfig()
    {
        return LoadConfigFromDisk();
    }

    private SiteThemeConfig LoadConfigFromDisk()
    {
        var relativePath = GetConfigRelativePath();
        var fullPath = Path.Combine(_environment.WebRootPath, relativePath.Replace('/', Path.DirectorySeparatorChar));

        if (!File.Exists(fullPath))
        {
            throw new FileNotFoundException($"No se encontró la configuración de tema del sitio: {fullPath}");
        }

        var json = File.ReadAllText(fullPath);
        var config = JsonSerializer.Deserialize<SiteThemeConfig>(json, JsonOptions)
            ?? throw new InvalidOperationException("La configuración de tema del sitio es inválida.");

        if (config.Themes.Count == 0)
        {
            throw new InvalidOperationException("La configuración de tema debe incluir al menos un template.");
        }

        return config;
    }

    private void WriteConfig(SiteThemeConfig config)
    {
        var relativePath = GetConfigRelativePath();
        var fullPath = Path.Combine(_environment.WebRootPath, relativePath.Replace('/', Path.DirectorySeparatorChar));
        var directory = Path.GetDirectoryName(fullPath);

        if (!string.IsNullOrWhiteSpace(directory))
        {
            Directory.CreateDirectory(directory);
        }

        var json = JsonSerializer.Serialize(config, JsonWriteOptions);
        File.WriteAllText(fullPath, json);
    }

    private string ResolveDefaultThemeId(SiteThemeConfig config)
    {
        var candidate = string.IsNullOrWhiteSpace(config.DefaultTheme)
            ? _configuration["SiteTheme:DefaultTheme"] ?? "ocean"
            : config.DefaultTheme;

        return ResolveThemeId(config, candidate);
    }

    private static string ResolveThemeId(SiteThemeConfig config, string themeId)
    {
        if (config.Themes.ContainsKey(themeId))
        {
            return themeId;
        }

        return config.Themes.Keys.First();
    }
}
