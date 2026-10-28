using System.Globalization;
using System.Security.Claims;
using Microsoft.AspNetCore.Mvc.Rendering;
using Web.Models.Admin;

public static class CotoContext
{
    public const string SelectedCondominioIdClaim = "selected_condominio_id";
    public const string SelectedCondominioNameClaim = "selected_condominio_name";
    public const string SelectedCasaIdClaim = "selected_casa_id";
    public const string SelectedCasaLabelClaim = "selected_casa_label";
    public const string DisplayNameClaim = "display_name";
    public const string PerfilIdClaim      = "perfil_id";
    public const string EsAdminClaim       = "es_admin";
    public const string UsuarioIdClaim     = "usuario_id";
    public const string NombreUsuarioClaim = "cq_nombre";
    public const string FotoUrlClaim       = "cq_foto";

    public static int GetUsuarioId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(UsuarioIdClaim);
        return int.TryParse(raw, out var id) ? id : 0;
    }

    public static int? GetSelectedCondominioId(ClaimsPrincipal user)
    {
        var rawValue = user.FindFirstValue(SelectedCondominioIdClaim);

        if (int.TryParse(rawValue, out var condominioId) && condominioId > 0)
        {
            return condominioId;
        }

        return null;
    }

    public static string GetSelectedCondominioName(ClaimsPrincipal user, string fallback = "Cuarta Quinientos")
    {
        return user.FindFirstValue(SelectedCondominioNameClaim)
            ?? user.FindFirstValue(DisplayNameClaim)
            ?? fallback;
    }

    public static int? GetSelectedCasaId(ClaimsPrincipal user)
    {
        var rawValue = user.FindFirstValue(SelectedCasaIdClaim);

        if (int.TryParse(rawValue, out var casaId) && casaId > 0)
        {
            return casaId;
        }

        return null;
    }

    public static string? GetSelectedCasaLabel(ClaimsPrincipal user)
    {
        var label = user.FindFirstValue(SelectedCasaLabelClaim);
        return string.IsNullOrWhiteSpace(label) ? null : label;
    }

    public static Claim BuildSelectedCondominioIdClaim(int condominioId)
        => new(SelectedCondominioIdClaim, condominioId.ToString(CultureInfo.InvariantCulture));

    public static Claim BuildSelectedCondominioNameClaim(string condominioName)
        => new(SelectedCondominioNameClaim, condominioName);

    public static Claim BuildSelectedCasaIdClaim(int casaId)
        => new(SelectedCasaIdClaim, casaId.ToString(CultureInfo.InvariantCulture));

    public static Claim BuildSelectedCasaLabelClaim(string casaLabel)
        => new(SelectedCasaLabelClaim, casaLabel);

    public static IReadOnlyList<CondominioFormViewModel> FilterCondominios(
        IEnumerable<CondominioFormViewModel> condominios,
        int? selectedCondominioId)
    {
        var activeCondominios = condominios
            .Where(item => item.bEliminado != true)
            .ToList();

        if (!selectedCondominioId.HasValue || selectedCondominioId.Value <= 0)
        {
            return activeCondominios;
        }

        var scopedCondominios = activeCondominios
            .Where(item => item.CondominioID == selectedCondominioId.Value)
            .ToList();

        return scopedCondominios.Count > 0 ? scopedCondominios : activeCondominios;
    }

    public static IReadOnlyList<CasaFormViewModel> FilterCasas(
        IEnumerable<CasaFormViewModel> casas,
        int? selectedCondominioId)
    {
        var activeCasas = casas
            .Where(item => item.CasaID.HasValue && item.bEliminado != true)
            .ToList();

        if (!selectedCondominioId.HasValue || selectedCondominioId.Value <= 0)
        {
            return activeCasas;
        }

        return activeCasas
            .Where(item => item.CondominioID == selectedCondominioId.Value)
            .ToList();
    }

    public static HashSet<int> GetCasaIdsForSelectedCondominio(
        IEnumerable<CasaFormViewModel> casas,
        int? selectedCondominioId)
    {
        return FilterCasas(casas, selectedCondominioId)
            .Where(item => item.CasaID.HasValue)
            .Select(item => item.CasaID!.Value)
            .ToHashSet();
    }

    public static IReadOnlyList<SelectListItem> BuildCondominioOptions(
        IEnumerable<CondominioFormViewModel> condominios,
        int? selectedCondominioId)
    {
        return condominios
            .Where(item => item.bEliminado != true)
            .OrderBy(item => item.NombreCondominio)
            .Select(item => new SelectListItem
            {
                Value = item.CondominioID?.ToString() ?? string.Empty,
                Text = BuildCondominioLabel(item),
                Selected = selectedCondominioId.HasValue && item.CondominioID == selectedCondominioId.Value
            })
            .ToList();
    }

    public static string BuildCondominioLabel(CondominioFormViewModel condominio)
    {
        if (string.IsNullOrWhiteSpace(condominio.DireccionCondominio))
        {
            return condominio.NombreCondominio;
        }

        return $"{condominio.NombreCondominio} - {condominio.DireccionCondominio}";
    }

    public static int GetPerfilId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(PerfilIdClaim);
        return int.TryParse(raw, out var id) ? id : 0;
    }

    public static bool GetIsAdministrador(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue(EsAdminClaim);
        return raw == "true";
    }

    public static string GetNombreUsuario(ClaimsPrincipal user)
    {
        return user.FindFirstValue(NombreUsuarioClaim)
            ?? user.Identity?.Name
            ?? "Usuario";
    }

    public static string? GetFotoUrl(ClaimsPrincipal user)
    {
        var v = user.FindFirstValue(FotoUrlClaim);
        return string.IsNullOrWhiteSpace(v) ? null : v;
    }
}