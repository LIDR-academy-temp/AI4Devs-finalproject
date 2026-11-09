using GraphApi.Infrastructure.RequestContext;
using GraphApi.Models.Dashboard.Resumen;

namespace GraphApi.Services.Dashboard.Resumen
{
    public interface IResumenDashboardService
    {
        Task<clResumenDashboard> GetResumenAsync(RequestContextData ctx);
    }
}