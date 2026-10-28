using GraphApi.Services.TKT;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.TKT;

[ApiController]
[Authorize]
[Route("TKT/[controller]")]
[Produces("application/json")]
public class EstadosTicketsController : ControllerBase
{
    private readonly ICuartaTicketQueryService _service;

    public EstadosTicketsController(ICuartaTicketQueryService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await _service.ListarEstadosAsync(ct));
}
