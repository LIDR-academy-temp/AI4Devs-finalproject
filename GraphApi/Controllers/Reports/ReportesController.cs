using GraphApi.Infrastructure.RequestContext;
using GraphApi.Models.Reports;
using GraphApi.Services.Reports;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;
using KeyNotFoundException = System.Collections.Generic.KeyNotFoundException;

namespace GraphApi.Controllers.Reports
{
    [ApiController]
    [Authorize]
    [Route("api/v1/reportes")]
    [Produces("application/json")]
    [SwaggerTag("Motor de reportes")]
    public class ReportesController : Controller
    {
        private readonly IReportService _reportService;
        private readonly IRequestContextAccessor _requestContextAccessor;
        private readonly ILogger<ReportesController> _logger;

        public ReportesController(IReportService reportService, IRequestContextAccessor requestContextAccessor, ILogger<ReportesController> logger)
        {
            _reportService = reportService;
            _requestContextAccessor = requestContextAccessor;
            _logger = logger;
        }

        /// <summary>
        /// Genera un reporte y devuelve el resultado serializado.
        /// </summary>
        /// <remarks>
        /// El body debe incluir `ReportId`, `OutputFormat` y opcionalmente `Parameters` o `BodyReporte`.
        /// </remarks>
        [HttpPost("generar")]
        [SwaggerOperation(Summary = "Generar reporte")]
        [ProducesResponseType(typeof(ReportResponse), 200)]
        [ProducesResponseType(typeof(ReportErrorResponse), 400)]
        [ProducesResponseType(typeof(ReportErrorResponse), 404)]
        [ProducesResponseType(typeof(ReportErrorResponse), 500)]
        public async Task<IActionResult> Generate([FromBody] ReportRequest request)
        {
            var correlationId = Guid.NewGuid().ToString("N")[..12];

            try
            {
                var context = _requestContextAccessor.GetRequiredContext();

                if (string.IsNullOrWhiteSpace(request.ReportId))
                {
                    return BadRequest(ErrorResponse("REPORT_PARAMETER_INVALID", "ReportId es requerido.", correlationId));
                }

                var response = await _reportService.GenerateAsync(request, context);
                response.CorrelationId = correlationId;

                if (!response.Success)
                {
                    return BadRequest(ErrorResponse(
                        response.ErrorCode ?? "REPORT_RENDER_FAILED",
                        response.ErrorMessage ?? "No se pudo generar el reporte.",
                        correlationId,
                        response.ValidationErrors));
                }

                return Ok(response);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ErrorResponse("REPORT_NOT_FOUND", ex.Message, correlationId));
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "ReportGenerateError | {CorrelationId}", correlationId);
                return StatusCode(500, ErrorResponse("REPORT_RENDER_FAILED", "Error interno al generar el reporte.", correlationId));
            }
        }

        /// <summary>
        /// Genera un reporte y devuelve el archivo binario listo para descargar.
        /// </summary>
        /// <remarks>
        /// Usa el mismo contrato de entrada que `generar`.
        /// </remarks>
        [HttpPost("descargar")]
        [SwaggerOperation(Summary = "Descargar reporte")]
        [ProducesResponseType(typeof(FileContentResult), 200)]
        [ProducesResponseType(typeof(ReportErrorResponse), 400)]
        [ProducesResponseType(typeof(ReportErrorResponse), 404)]
        public async Task<IActionResult> Download([FromBody] ReportRequest request)
        {
            var correlationId = Guid.NewGuid().ToString("N")[..12];

            try
            {
                var context = _requestContextAccessor.GetRequiredContext();
                var response = await _reportService.GenerateAsync(request, context);

                if (!response.Success || string.IsNullOrWhiteSpace(response.Base64Content))
                {
                    return BadRequest(ErrorResponse(
                        response.ErrorCode ?? "REPORT_RENDER_FAILED",
                        response.ErrorMessage ?? "No se pudo generar el reporte.",
                        correlationId,
                        response.ValidationErrors));
                }

                var bytes = Convert.FromBase64String(response.Base64Content);
                return File(bytes, response.ContentType ?? "application/octet-stream", response.FileName ?? "reporte.bin");
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ErrorResponse("REPORT_NOT_FOUND", ex.Message, correlationId));
            }
        }

        /// <summary>
        /// Devuelve el catalogo de reportes disponibles.
        /// </summary>
        /// <remarks>
        /// Requiere autenticacion y contexto de usuario en headers.
        /// </remarks>
        [HttpGet("catalogo")]
        [SwaggerOperation(Summary = "Catálogo de reportes")]
        [ProducesResponseType(typeof(IEnumerable<ReportCatalogItem>), 200)]
        public async Task<IActionResult> GetCatalog()
        {
            return Ok(await _reportService.GetCatalogAsync());
        }

        /// <summary>
        /// Devuelve la definicion completa de un reporte.
        /// </summary>
        /// <remarks>
        /// Útil para previsualizar parametros y formato antes de ejecutar.
        /// </remarks>
        [HttpGet("definicion/{reportId}")]
        [SwaggerOperation(Summary = "Definición de reporte")]
        [ProducesResponseType(typeof(ReportDefinition), 200)]
        [ProducesResponseType(typeof(ReportErrorResponse), 404)]
        public async Task<IActionResult> GetDefinition(string reportId)
        {
            try
            {
                var context = _requestContextAccessor.GetRequiredContext();
                var definition = await _reportService.GetDefinitionAsync(reportId, context);
                return Ok(definition);
            }
            catch (KeyNotFoundException ex)
            {
                return NotFound(ErrorResponse("REPORT_NOT_FOUND", ex.Message, Guid.NewGuid().ToString("N")[..12]));
            }
        }

        private static ReportErrorResponse ErrorResponse(string code, string message, string correlationId, List<string>? details = null)
            => new()
            {
                ErrorCode = code,
                Message = message,
                CorrelationId = correlationId,
                Details = details
            };
    }
}