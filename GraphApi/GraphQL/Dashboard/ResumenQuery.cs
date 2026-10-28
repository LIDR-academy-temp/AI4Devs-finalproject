using HotChocolate.Authorization;
using GraphApi.Infrastructure.RequestContext;
using GraphApi.Models.Dashboard.Resumen;
using GraphApi.Services.Dashboard.Resumen;

namespace GraphApi.GraphQL.Dashboard.Resumen
{
    [QueryType]
    [GraphQLDescription("Punto de entrada para el resumen ejecutivo del fraccionamiento.")]
    public class ResumenQuery
    {
        [Authorize]
        [GraphQLName("obtenerResumenDashboard")]
        [GraphQLDescription("Obtiene los indicadores principales del condominio.")]
        public Task<clResumenDashboard> GetResumenAsync(
            [Service]
            [GraphQLDescription("Permite acceder a los headers HTTP.")]
            IRequestContextAccessor requestContextAccessor,
            [Service]
            [GraphQLDescription("Servicio de resumen ejecutivo.")]
            IResumenDashboardService service)
        {
            var ctx = requestContextAccessor.GetRequiredContext();
            return service.GetResumenAsync(ctx);
        }
    }
}