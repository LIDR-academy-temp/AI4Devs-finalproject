using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.SiteTheme;
using Web.Services;

namespace Web.Controllers.Admin;

[Authorize]
[Route("Admin/TemaSitio")]
public sealed class SiteThemeAdminController : Controller
{
    private readonly ISiteThemeService _siteTheme;

    public SiteThemeAdminController(ISiteThemeService siteTheme)
    {
        _siteTheme = siteTheme;
    }

    [HttpGet("")]
    public IActionResult Index()
    {
        if (!CotoContext.GetIsAdministrador(User))
        {
            return Forbid();
        }

        return View("~/Views/Admin/TemaSitio.cshtml", BuildPageModel());
    }

    [HttpPost("Guardar")]
    [ValidateAntiForgeryToken]
    public IActionResult Save(SiteThemeAdminSaveViewModel model)
    {
        if (!CotoContext.GetIsAdministrador(User))
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(model.GoogleFontsUrl)
            || string.IsNullOrWhiteSpace(model.FontBody)
            || string.IsNullOrWhiteSpace(model.FontHeading))
        {
            TempData["Error"] = "Las fuentes del sitio son obligatorias.";
            return RedirectToAction(nameof(Index));
        }

        try
        {
            _siteTheme.SaveSettings(model);
            TempData["Message"] = "Template del sitio actualizado. Recarga el portal para ver el cambio.";
        }
        catch (Exception ex)
        {
            TempData["Error"] = $"No se pudo guardar la configuración: {ex.Message}";
        }

        return RedirectToAction(nameof(Index));
    }

    [HttpPost("GuardarColores")]
    [ValidateAntiForgeryToken]
    public IActionResult SaveThemeTokens(SiteThemeAdminSaveTokensViewModel model)
    {
        if (!CotoContext.GetIsAdministrador(User))
        {
            return Forbid();
        }

        if (string.IsNullOrWhiteSpace(model.ThemeId))
        {
            TempData["Error"] = "Debes seleccionar un template.";
            return RedirectToAction(nameof(Index));
        }

        try
        {
            _siteTheme.SaveThemeTokens(model);
            TempData["Message"] = $"Colores del template '{model.ThemeId}' guardados.";
        }
        catch (Exception ex)
        {
            TempData["Error"] = $"No se pudieron guardar los colores: {ex.Message}";
        }

        return RedirectToAction(nameof(Index));
    }

    private SiteThemeAdminPageViewModel BuildPageModel()
    {
        var config = _siteTheme.GetConfig();
        var defaultThemeId = _siteTheme.GetDefaultThemeId();

        return new SiteThemeAdminPageViewModel
        {
            ConfigPath = _siteTheme.GetConfigRelativePath(),
            DefaultTheme = defaultThemeId,
            AllowUserSwitch = config.AllowUserSwitch,
            Fonts = config.Fonts,
            Themes = config.Themes
                .OrderBy(pair => pair.Key)
                .Select(pair => new SiteThemeAdminThemeCardViewModel
                {
                    Id = pair.Key,
                    Label = pair.Value.Label,
                    MetaThemeColor = pair.Value.MetaThemeColor,
                    PrimaryColor = pair.Value.Tokens.GetValueOrDefault("--cq-primary", "#043b44"),
                    AccentColor = pair.Value.Tokens.GetValueOrDefault("--cq-accent", "#f84a36"),
                    SidebarColor = pair.Value.Tokens.GetValueOrDefault("--cq-sidebar-bg", "#14263d"),
                    BgColor = pair.Value.Tokens.GetValueOrDefault("--cq-bg", "#f3f7fc"),
                    IsDefault = string.Equals(pair.Key, defaultThemeId, StringComparison.OrdinalIgnoreCase)
                })
                .ToList(),
            Message = TempData["Message"]?.ToString(),
            Error = TempData["Error"]?.ToString()
        };
    }
}
