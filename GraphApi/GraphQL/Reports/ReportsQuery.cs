using GraphApi.Infrastructure.RequestContext;
using GraphApi.Models.Reports;
using GraphApi.Services.Reports;
using HotChocolate.Authorization;

namespace GraphApi.GraphQL.Reports
{
    [QueryType]
    public class ReportsQuery
    {
        [Authorize]
        [GraphQLName("obtenerCatalogoReportes")]
        public async Task<IEnumerable<ReportCatalogItem>> GetCatalogAsync([Service] IReportService reportService)
        {
            return await reportService.GetCatalogAsync();
        }

        [Authorize]
        [GraphQLName("generarReporte")]
        public async Task<ReportResponse> GenerateReportAsync(
            string reportId,
            ReportOutputFormat format,
            Dictionary<string, string>? parameters,
            [Service] IReportService reportService,
            [Service] IRequestContextAccessor requestContextAccessor)
        {
            var context = requestContextAccessor.GetRequiredContext();
            return await reportService.GenerateAsync(new ReportRequest
            {
                ReportId = reportId,
                OutputFormat = format,
                Parameters = parameters
            }, context);
        }
    }
}