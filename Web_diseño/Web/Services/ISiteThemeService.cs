using Web.Models.SiteTheme;

namespace Web.Services;

public interface ISiteThemeService
{
    SiteThemeConfig GetConfig();
    string GetClientJson();
    string GetDefaultThemeId();
    string GetMetaThemeColor(string? themeId = null);
    string GetConfigRelativePath();
    void SaveSettings(SiteThemeAdminSaveViewModel model);
    void SaveThemeTokens(SiteThemeAdminSaveTokensViewModel model);
    void InvalidateCache();
}
