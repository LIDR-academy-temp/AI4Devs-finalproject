using FluentValidation;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.TKT;
using GraphApi.Models.TKT.Tickets;
using GraphApi.Models.TKT.Validators;
using GraphApi.Services.TKT;
using GraphApi.Services.TKT.Tickets;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Controllers.TKT.Tickets
{
    /// <summary>
    /// Gestión de Tickets: consulta, creación, actualización y borrado.
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("TKT/[controller]")]
    [Produces("application/json")]
    [SwaggerTag("Operaciones sobre Tickets")]
    public class TicketsController : Controller
    {
        private readonly ITicketsService _objService;
        private readonly ICuartaTicketService _cuartaTickets;
        private readonly IValidator<clCreateTickets> _createValidator;
        private readonly IValidator<CrearTicketInput> _crearTicketValidator;
        private readonly IValidator<clUpdateTickets> _updateValidator;

        private readonly ICuartaTicketQueryService _ticketQuery;
        private readonly ICuartaTicketAdminService _ticketAdmin;
        private readonly IValidator<TicketFiltroDto> _filtroValidator;

        public TicketsController(
            ITicketsService objService,
            ICuartaTicketService cuartaTickets,
            ICuartaTicketQueryService ticketQuery,
            ICuartaTicketAdminService ticketAdmin,
            IValidator<clCreateTickets> createValidator,
            IValidator<CrearTicketInput> crearTicketValidator,
            IValidator<TicketFiltroDto> filtroValidator,
            IValidator<clUpdateTickets> updateValidator)
        {
            _objService = objService;
            _cuartaTickets = cuartaTickets;
            _ticketQuery = ticketQuery;
            _ticketAdmin = ticketAdmin;
            _createValidator = createValidator;
            _crearTicketValidator = crearTicketValidator;
            _filtroValidator = filtroValidator;
            _updateValidator = updateValidator;
        }

        [HttpGet("mis")]
        [ProducesResponseType(typeof(PaginaDto<MiTicketItemDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetMisTickets(
            [FromQuery] int? estadoTicketId,
            [FromQuery] int? categoriaTicketId,
            [FromQuery] int pagina = 1,
            [FromQuery] int tamano = 20,
            CancellationToken ct = default)
        {
            if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
            {
                return Unauthorized();
            }

            var filtro = new TicketFiltroDto
            {
                EstadoTicketId = estadoTicketId,
                CategoriaTicketId = categoriaTicketId,
                Pagina = pagina,
                Tamano = tamano,
            };

            var validation = await _filtroValidator.ValidateAsync(filtro, ct);
            if (!validation.IsValid)
            {
                return Problem(
                    detail: string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)),
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "VALIDATION_ERROR",
                    extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
            }

            var page = await _ticketQuery.GetMisTicketsAsync(usuarioId, filtro, ct);
            return Ok(page);
        }

        [HttpGet("admin")]
        [Authorize(Policy = "SoloAdministrador")]
        [ProducesResponseType(typeof(PaginaDto<AdminTicketItemDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetAdminTickets(
            [FromQuery] int? estadoTicketId,
            [FromQuery] int? prioridadTicketId,
            [FromQuery] int pagina = 1,
            [FromQuery] int tamano = 20,
            CancellationToken ct = default)
        {
            var filtro = new TicketFiltroDto
            {
                EstadoTicketId = estadoTicketId,
                Pagina = pagina,
                Tamano = tamano,
            };

            var validation = await _filtroValidator.ValidateAsync(filtro, ct);
            if (!validation.IsValid)
            {
                return Problem(
                    detail: string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)),
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "VALIDATION_ERROR",
                    extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
            }

            var page = await _ticketAdmin.ListarAsync(filtro, prioridadTicketId, ct);
            return Ok(page);
        }

        [HttpPatch("{ticketId:int}/estado/{estadoId:int}")]
        [Authorize(Policy = "AdminOAsignado")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> CambiarEstadoJwt(int ticketId, int estadoId, CancellationToken ct)
        {
            if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
            {
                return Unauthorized();
            }

            var correo = JwtUserContext.GetCorreo(User) ?? "usuario";
            var perfil = JwtUserContext.GetPerfil(User) ?? string.Empty;

            var (ok, code, status, detail) = await _ticketAdmin.CambiarEstadoAsync(
                ticketId, estadoId, usuarioId, correo, perfil, ct);

            if (!ok)
            {
                return Problem(
                    detail: detail ?? "No se pudo cambiar el estado",
                    statusCode: status,
                    title: code,
                    extensions: new Dictionary<string, object?> { ["code"] = code });
            }

            return NoContent();
        }

        /// <summary>
        /// Obtiene todos los Tickets, con filtros opcionales.
        /// </summary>
        /// <param name="userId">Id de usuario (header "UserID").</param>
        /// <param name="windowName">Nombre de la aplicación (header "WindowName").</param>
        /// <param name="ticketID">TicketID</param>
        /// <param name="tituloTicket">TituloTicket</param>
        /// <param name="descripcionTicket">DescripcionTicket</param>
        /// <param name="usuarioSolicitanteID">UsuarioSolicitanteID</param>
        /// <param name="nombreSolicitante">NombreSolicitante</param>
        /// <param name="prioridadTicketID">PrioridadTicketID</param>
        /// <param name="prioridadTicket">PrioridadTicket</param>
        /// <param name="estadoTicketID">EstadoTicketID</param>
        /// <param name="estadoTicket">EstadoTicket</param>
        /// <param name="fechaCreacionTicket">FechaCreacionTicket</param>
        /// <param name="fechaCierre">FechaCierre</param>
        /// <param name="bEliminado">bEliminado</param>
        /// <returns>Listado de Tickets</returns>
        [HttpGet]
        [SwaggerOperation(
            Summary = "Listar Tickets",
            Description = "Devuelve Tickets aplicando filtros opcionales."
        )]
        [ProducesResponseType(typeof(IEnumerable<clReadTickets>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<clReadTickets>>> GetAll(
            [FromHeader(Name = "UserID")] int nUserId,
            [FromHeader(Name = "WindowName")] string sWindowName,
            [FromQuery] int? ticketID,
            [FromQuery] string? tituloTicket,
            [FromQuery] string? descripcionTicket,
            [FromQuery] int? usuarioSolicitanteID,
            [FromQuery] string? nombreSolicitante,
            [FromQuery] int? prioridadTicketID,
            [FromQuery] string? prioridadTicket,
            [FromQuery] int? estadoTicketID,
            [FromQuery] string? estadoTicket,
            [FromQuery] DateTime? fechaCreacionTicket,
            [FromQuery] DateTime? fechaCierre,
            [FromQuery] bool? bEliminado,
            [FromQuery] string? columnNames)
        {
            var vList = await _objService.GetTicketsDynamic(
                ticketID, 
                tituloTicket, 
                descripcionTicket, 
                usuarioSolicitanteID, 
                nombreSolicitante, 
                prioridadTicketID, 
                prioridadTicket, 
                estadoTicketID, 
                estadoTicket, 
                fechaCreacionTicket, 
                fechaCierre, 
                bEliminado, 
                columnNames, nUserId, sWindowName);
              return vList.Count()==0  ? NotFound() :  Ok(vList);
        }

        /// <summary>
        /// Crea un ticket (residente autenticado por JWT).
        /// </summary>
        [HttpPost]
        [Authorize(Roles = "Residente")]
        [SwaggerOperation(Summary = "Crear ticket (HU-TKT-01)")]
        [ProducesResponseType(typeof(clReadTickets), StatusCodes.Status201Created)]
        public async Task<IActionResult> Create([FromBody] CrearTicketInput input, CancellationToken ct)
        {
            var validation = await _crearTicketValidator.ValidateAsync(input, ct);
            if (!validation.IsValid)
            {
                return Problem(
                    detail: string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)),
                    statusCode: StatusCodes.Status400BadRequest,
                    title: "VALIDATION_ERROR",
                    extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
            }

            if (!JwtUserContext.TryGetUsuarioId(User, out var usuarioId))
            {
                return Unauthorized();
            }

            var correo = JwtUserContext.GetCorreo(User) ?? "residente";
            var perfil = JwtUserContext.GetPerfil(User) ?? string.Empty;

            var (ticket, code, status, detail) = await _cuartaTickets.CrearTicketAsync(
                input, usuarioId, correo, perfil, ct);

            if (ticket is null)
            {
                return Problem(
                    detail: detail ?? "No se pudo crear el ticket",
                    statusCode: status,
                    title: code,
                    extensions: new Dictionary<string, object?> { ["code"] = code });
            }

            return Created($"/TKT/Tickets/{ticket.TicketID}", ticket);
        }

        [HttpPost("legacy")]
        [SwaggerOperation(Summary = "Crear ticket (scaffold legacy con headers)")]
        public async Task<ActionResult<clReadTickets>> CreateLegacy(
            [FromHeader(Name = "UserID")] int nUserId,
            [FromHeader(Name = "WindowName")] string sWindowName,
            [FromBody] clCreateTickets objInput)
        {
            var vValidation = await _createValidator.ValidateAsync(objInput);
            if (!vValidation.IsValid)
                return BadRequest(vValidation.Errors.Select(e => e.ErrorMessage));

            var vCreated = await _objService.CreateTickets(objInput, nUserId, sWindowName);
            return vCreated is null ? NoContent() : vCreated;
        }

        /// <summary>
        /// Actualización parcial de Ticket.
        /// </summary>
        /// <param name="userId">Id de usuario (header "UserID").</param>
        /// <param name="windowName">Nombre de la aplicación (header "WindowName").</param>
        /// <param name="input">Campos a actualizar y el ID del Ticket.</param>
        /// <returns>El Ticket actualizado.</returns>
        [HttpPatch]
        [SwaggerOperation(
            Summary = "Actualizar Tickets",
            Description = "Actualiza uno o varios campos de Ticket existente."
        )]
        [ProducesResponseType(typeof(clReadTickets), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        public async Task<ActionResult<clReadTickets>> Patch(
            [FromHeader(Name = "UserID")] int nUserId,
            [FromHeader(Name = "WindowName")] string sWindowName,
            [FromBody] clUpdateTickets objInput)
        {
            var vValidation = await _updateValidator.ValidateAsync(objInput);
            if (!vValidation.IsValid)
                return BadRequest(vValidation.Errors.Select(e => e.ErrorMessage));

            var vUpdated = await _objService.UpdateTickets(objInput, nUserId, sWindowName);
            return vUpdated is null ? NotFound() : Ok(vUpdated);
        }

        /// <summary>
        /// Cambia el estado de un Ticket con validación de transición.
        /// Genera notificación automática al solicitante.
        /// </summary>
        /// <param name="ticketID">ID del Ticket.</param>
        /// <param name="nuevoEstadoTicketID">ID del nuevo estado destino.</param>
        [HttpPatch("legacy/{ticketID:int}/estado/{nuevoEstadoTicketID:int}")]
        [SwaggerOperation(
            Summary = "Cambiar estado de Ticket (legacy headers)",
            Description = "Valida la transición de estado, actualiza el Ticket y genera notificación al solicitante."
        )]
        [ProducesResponseType(typeof(clReadTickets), StatusCodes.Status200OK)]
        [ProducesResponseType(StatusCodes.Status400BadRequest)]
        [ProducesResponseType(StatusCodes.Status404NotFound)]
        public async Task<ActionResult<clReadTickets>> ChangeEstado(
            [FromHeader(Name = "UserID")] int nUserId,
            [FromHeader(Name = "WindowName")] string sWindowName,
            int ticketID,
            int nuevoEstadoTicketID)
        {
            var vResult = await _objService.ChangeEstadoTicket(ticketID, nuevoEstadoTicketID, nUserId, sWindowName);
            return Ok(vResult);
        }

        /// <summary>
        /// Elimina un Ticket por su ID.
        /// </summary>
        [HttpDelete("{nTicketsID:int}")]
        [SwaggerOperation(
            Summary = "Eliminar Ticket",
            Description = "Borra un Ticket si existe."
        )]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Delete(int nTicketsID)
        {
            var success = await _objService.DeleteTickets(nTicketsID);
            return success ? NoContent() : NotFound();
        }
    }
}
