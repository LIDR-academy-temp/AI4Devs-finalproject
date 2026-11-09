using GraphApi.Models.Dashboard;

namespace GraphApi.Services.Dashboard.Kpi;

public interface IDashboardKpiService
{
    Task<(object? Body, string? Code, int Status, string? Detail)> GetResumenAsync(
        System.Security.Claims.ClaimsPrincipal user,
        ResumenPeriodoQuery query,
        CancellationToken ct = default);
}
