using System.Security.Claims;
using Microsoft.Extensions.Caching.Memory;
using Web.Models.Admin;

namespace Web.Services;

public sealed class PermissionService : IPermissionService
{
    private readonly IGraphApiBackendService _backend;
    private readonly IMemoryCache _cache;
    private static readonly TimeSpan CacheDuration = TimeSpan.FromMinutes(5);

    public PermissionService(IGraphApiBackendService backend, IMemoryCache cache)
    {
        _backend = backend;
        _cache   = cache;
    }

    public async Task<bool> HasMenuAccessAsync(ClaimsPrincipal user, string ruta)
    {
        if (CotoContext.GetIsAdministrador(user)) return true;

        var entry = await GetCacheEntryAsync(user);
        return entry.Menus.Any(m => string.Equals(m.Ruta, ruta, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<bool> HasActionAsync(ClaimsPrincipal user, string accion)
    {
        if (CotoContext.GetIsAdministrador(user)) return true;

        var entry = await GetCacheEntryAsync(user);
        return entry.Botones.Any(b => string.Equals(b.Accion, accion, StringComparison.OrdinalIgnoreCase));
    }

    public async Task<IReadOnlyList<PerfilMenuItemViewModel>> GetVisibleMenusAsync(ClaimsPrincipal user)
    {
        if (CotoContext.GetIsAdministrador(user))
        {
            // Admin: devuelve todos los menús del cache (o todos los menús planos)
            var perfilId = CotoContext.GetPerfilId(user);
            if (perfilId > 0)
            {
                var entry = await GetCacheEntryAsync(user);
                return BuildHierarchy(entry.Menus);
            }
            return Array.Empty<PerfilMenuItemViewModel>();
        }

        var cacheEntry = await GetCacheEntryAsync(user);
        return BuildHierarchy(cacheEntry.Menus);
    }

    // -------------------------------------------------------

    private async Task<PermissionCacheEntry> GetCacheEntryAsync(ClaimsPrincipal user)
    {
        var perfilId = CotoContext.GetPerfilId(user);
        if (perfilId <= 0)
            return new PermissionCacheEntry();

        var cacheKey = $"perms-{perfilId}";
        if (_cache.TryGetValue(cacheKey, out PermissionCacheEntry? cached) && cached is not null)
            return cached;

        var menus  = await _backend.GetPerfilMenusAsync(perfilId);
        var botones = await _backend.GetPerfilMenuBotonAsync(perfilId);

        var entry = new PermissionCacheEntry { Menus = menus, Botones = botones };
        _cache.Set(cacheKey, entry, new MemoryCacheEntryOptions
        {
            SlidingExpiration = CacheDuration
        });

        return entry;
    }

    private static IReadOnlyList<PerfilMenuItemViewModel> BuildHierarchy(IReadOnlyList<PerfilMenuItemViewModel> flat)
    {
        // Limpiar children previos (evita duplicados al reutilizar objetos de caché)
        foreach (var item in flat)
            item.Children.Clear();

        var byId = flat.ToDictionary(m => m.MenuID);
        var roots = new List<PerfilMenuItemViewModel>();

        foreach (var menu in flat.OrderBy(m => m.Orden))
        {
            if (menu.PadreMenuID.HasValue && byId.TryGetValue(menu.PadreMenuID.Value, out var parent))
                parent.Children.Add(menu);
            else
                roots.Add(menu);
        }

        return roots;
    }

    public void InvalidateCache(int perfilId)
        => _cache.Remove($"perms-{perfilId}");
}
