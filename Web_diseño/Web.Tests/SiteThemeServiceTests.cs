using Microsoft.AspNetCore.Hosting;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.FileProviders;
using Web.Models.SiteTheme;
using Web.Services;
using Xunit;

namespace Web.Tests;

public class SiteThemeServiceTests
{
    [Fact]
    public void SaveSettings_UpdatesDefaultThemeAndFonts()
    {
        var root = Path.Combine(Path.GetTempPath(), "cq-theme-tests", Guid.NewGuid().ToString("N"));
        var configDir = Path.Combine(root, "config");
        Directory.CreateDirectory(configDir);

        var configPath = Path.Combine(configDir, "cq-site-theme.json");
        File.Copy(
            Path.Combine(GetWebRootPath(), "config", "cq-site-theme.json"),
            configPath);

        var environment = new TestWebHostEnvironment { WebRootPath = root };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["SiteTheme:ConfigPath"] = "config/cq-site-theme.json"
            })
            .Build();

        var cache = new MemoryCache(new MemoryCacheOptions());
        var service = new SiteThemeService(environment, configuration, cache);

        service.SaveSettings(new SiteThemeAdminSaveViewModel
        {
            DefaultTheme = "corporate",
            AllowUserSwitch = false,
            GoogleFontsUrl = "https://fonts.example/test.css",
            FontBody = "Arial, sans-serif",
            FontHeading = "Georgia, serif"
        });

        cache.Dispose();

        var verifyCache = new MemoryCache(new MemoryCacheOptions());
        var verifyService = new SiteThemeService(environment, configuration, verifyCache);
        var config = verifyService.GetConfig();

        Assert.Equal("corporate", config.DefaultTheme);
        Assert.False(config.AllowUserSwitch);
        Assert.Equal("https://fonts.example/test.css", config.Fonts.GoogleFontsUrl);
        Assert.Equal("Arial, sans-serif", config.Fonts.Body);
        Assert.Equal("Georgia, serif", config.Fonts.Heading);
        Assert.True(config.Themes.ContainsKey("corporate"));

        verifyCache.Dispose();
        Directory.Delete(root, recursive: true);
    }

    [Fact]
    public void SaveThemeTokens_UpdatesPrimaryAccentSidebarAndBg()
    {
        var root = Path.Combine(Path.GetTempPath(), "cq-theme-tests", Guid.NewGuid().ToString("N"));
        var configDir = Path.Combine(root, "config");
        Directory.CreateDirectory(configDir);

        var configPath = Path.Combine(configDir, "cq-site-theme.json");
        File.Copy(
            Path.Combine(GetWebRootPath(), "config", "cq-site-theme.json"),
            configPath);

        var environment = new TestWebHostEnvironment { WebRootPath = root };
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["SiteTheme:ConfigPath"] = "config/cq-site-theme.json"
            })
            .Build();

        var cache = new MemoryCache(new MemoryCacheOptions());
        var service = new SiteThemeService(environment, configuration, cache);

        service.SaveThemeTokens(new SiteThemeAdminSaveTokensViewModel
        {
            ThemeId = "ocean",
            MetaThemeColor = "#112233",
            PrimaryColor = "#112233",
            AccentColor = "#445566",
            SidebarColor = "#778899",
            BgColor = "#aabbcc"
        });

        cache.Dispose();

        var verifyCache = new MemoryCache(new MemoryCacheOptions());
        var verifyService = new SiteThemeService(environment, configuration, verifyCache);
        var theme = verifyService.GetConfig().Themes["ocean"];

        Assert.Equal("#112233", theme.MetaThemeColor);
        Assert.Equal("#112233", theme.Tokens["--cq-primary"]);
        Assert.Equal("#445566", theme.Tokens["--cq-accent"]);
        Assert.Equal("#778899", theme.Tokens["--cq-sidebar-bg"]);
        Assert.Equal("#aabbcc", theme.Tokens["--cq-bg"]);
        Assert.Equal("#112233", theme.Tokens["--color-primary"]);
        Assert.Equal("#445566", theme.Tokens["--color-accent"]);

        verifyCache.Dispose();
        Directory.Delete(root, recursive: true);
    }

    private static string GetWebRootPath()
    {
        var dir = AppContext.BaseDirectory;
        while (!string.IsNullOrEmpty(dir))
        {
            var candidate = Path.Combine(dir, "Web", "wwwroot");
            if (Directory.Exists(candidate))
            {
                return candidate;
            }

            candidate = Path.Combine(dir, "wwwroot");
            if (Directory.Exists(Path.Combine(candidate, "config", "cq-site-theme.json")))
            {
                return candidate;
            }

            dir = Directory.GetParent(dir)?.FullName ?? string.Empty;
        }

        throw new DirectoryNotFoundException("No se encontró wwwroot del proyecto Web.");
    }

    private sealed class TestWebHostEnvironment : IWebHostEnvironment
    {
        public string ApplicationName { get; set; } = "Web.Tests";
        public IFileProvider WebRootFileProvider { get; set; } = null!;
        public string WebRootPath { get; set; } = string.Empty;
        public string EnvironmentName { get; set; } = "Development";
        public string ContentRootPath { get; set; } = string.Empty;
        public IFileProvider ContentRootFileProvider { get; set; } = null!;
    }
}
