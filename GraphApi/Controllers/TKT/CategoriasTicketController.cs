using GraphApi.Services.TKT;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace GraphApi.Controllers.TKT;

[ApiController]
[Authorize]
[Route("TKT/[controller]")]
[Produces("application/json")]
public class CategoriasTicketController : ControllerBase
{
    private readonly ICuartaTicketQueryService _service;

    public CategoriasTicketController(ICuartaTicketQueryService service) => _service = service;

    [HttpGet]
    public async Task<IActionResult> Get(CancellationToken ct) =>
        Ok(await _service.ListarCategoriasAsync(ct));
}
