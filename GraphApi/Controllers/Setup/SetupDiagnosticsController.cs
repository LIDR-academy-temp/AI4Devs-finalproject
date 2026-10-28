using GraphApi.Infrastructure.Common;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.Setup;

/// <summary>
/// Endpoints de diagnóstico para SETUP-000 (no negocio). Quitar o proteger en producción si se desea.
/// </summary>
[ApiController]
[Route("Setup/[controller]")]
public class SetupDiagnosticsController : ControllerBase
{
    [HttpGet("conflict-sample")]
    [ProducesResponseType(typeof(ProblemDetails), StatusCodes.Status409Conflict)]
    public IActionResult ConflictSample() =>
        Result.Fail("CONFLICT", "Conflicto de prueba SETUP-000.").ToActionResult();
}
