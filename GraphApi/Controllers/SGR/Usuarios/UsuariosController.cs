using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Swashbuckle.AspNetCore.Annotations;
using FluentValidation;
using GraphApi.Models.SGR.Usuarios;
using GraphApi.Infrastructure.Security;
using GraphApi.Services.SGR.Usuarios;
using GraphApi.Services.TKT;

namespace GraphApi.Controllers.SGR.Usuarios
{
    /// <summary>
    /// Gestión de Usuarios: consulta, creación, actualización y borrado.
    /// </summary>
    [ApiController]
    [Authorize]
    [Route("SGR/[controller]")]
    [Produces("application/json")]
    [SwaggerTag("Operaciones sobre Usuarios")]
    public class UsuariosController : Controller
    {
        private readonly IUsuariosService _objService;
        private readonly ICuartaTicketAdminService _ticketAdmin;
        private readonly IUsuarioPerfilService _perfilService;
        private readonly ICuartaUsuarioAdminService _usuarioAdmin;
        private readonly IValidator<clCreateUsuarios> _createValidator;
        private readonly IValidator<clUpdateUsuarios> _updateValidator;
        private readonly IValidator<ActualizarPerfilRequest> _perfilValidator;
        private readonly IValidator<CrearUsuarioAdminRequest> _crearAdminValidator;

        public UsuariosController(
            IUsuariosService objService,
            ICuartaTicketAdminService ticketAdmin,
            IUsuarioPerfilService perfilService,
            ICuartaUsuarioAdminService usuarioAdmin,
            IValidator<clCreateUsuarios> createValidator,
            IValidator<clUpdateUsuarios> updateValidator,
            IValidator<ActualizarPerfilRequest> perfilValidator,
            IValidator<CrearUsuarioAdminRequest> crearAdminValidator)
        {
            _objService = objService;
            _ticketAdmin = ticketAdmin;
            _perfilService = perfilService;
            _usuarioAdmin = usuarioAdmin;
            _createValidator = createValidator;
            _updateValidator = updateValidator;
            _perfilValidator = perfilValidator;
            _crearAdminValidator = crearAdminValidator;
        }

        [HttpGet("trabajadores")]
        [Authorize(Policy = "SoloAdministrador")]
        public async Task<IActionResult> GetTrabajadores(CancellationToken ct)
        {
            var list = await _ticketAdmin.ListarTrabajadoresAsync(ct);
            return Ok(list);
        }

        [HttpGet("{id:int}")]
        [ProducesResponseType(typeof(PerfilDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> GetPerfil(int id, CancellationToken ct)
        {
            if (!JwtUserContext.TryGetUsuarioId(User, out var callerId))
            {
                return Unauthorized();
            }

            var (data, code, status, detail) = await _perfilService.ObtenerAsync(
                id,
                callerId,
                JwtUserContext.EsAdministrador(User),
                ct);

            if (data is null)
            {
                return Problem(detail: detail, statusCode: status, title: code,
                    extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
            }

            return Ok(data);
        }

        [HttpPut("{id:int}")]
        [ProducesResponseType(typeof(PerfilDto), StatusCodes.Status200OK)]
        public async Task<IActionResult> PutPerfil(int id, [FromBody] ActualizarPerfilRequest request, CancellationToken ct)
        {
            if (!JwtUserContext.TryGetUsuarioId(User, out var callerId))
            {
                return Unauthorized();
            }

            var validation = await _perfilValidator.ValidateAsync(request, ct);
            if (!validation.IsValid)
            {
                return ValidationProblem(new ValidationProblemDetails(
                    validation.Errors.GroupBy(e => e.PropertyName)
                        .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())));
            }

            var correo = JwtUserContext.GetCorreo(User) ?? "usuario";
            var (data, code, status, detail) = await _perfilService.ActualizarAsync(
                id,
                request,
                callerId,
                JwtUserContext.EsAdministrador(User),
                correo,
                ct);

            if (data is null)
            {
                return Problem(detail: detail, statusCode: status, title: code,
                    extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
            }

            if (JwtUserContext.EsAdministrador(User)
                && (!string.IsNullOrWhiteSpace(request.Perfil) || request.CasaId.HasValue))
            {
                var (okExtras, codeExtras, statusExtras, detailExtras) =
                    await _usuarioAdmin.ActualizarAdminExtrasAsync(
                        id, request.Perfil, request.CasaId, callerId, correo, ct);
                if (!okExtras)
                {
                    return Problem(detail: detailExtras, statusCode: statusExtras, title: codeExtras,
                        extensions: codeExtras is null ? null : new Dictionary<string, object?> { ["code"] = codeExtras });
                }

                var refreshed = await _perfilService.ObtenerAsync(id, callerId, true, ct);
                if (refreshed.Data is not null)
                {
                    refreshed.Data.RequiereReLogin = data.RequiereReLogin;
                    return Ok(refreshed.Data);
                }
            }

            return Ok(data);
        }

        [HttpPatch("{id:int}/desactivar")]
        [Authorize(Policy = "SoloAdministrador")]
        public async Task<IActionResult> Desactivar(int id, CancellationToken ct)
        {
            if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            {
                return Unauthorized();
            }

            var correo = JwtUserContext.GetCorreo(User) ?? "admin";
            var (ok, code, status, detail) = await _usuarioAdmin.DesactivarAsync(id, adminId, correo, ct);
            if (!ok)
            {
                return Problem(detail: detail, statusCode: status, title: code,
                    extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
            }

            return NoContent();
        }

        [HttpPatch("{id:int}/activar")]
        [Authorize(Policy = "SoloAdministrador")]
        public async Task<IActionResult> Activar(int id, CancellationToken ct)
        {
            if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            {
                return Unauthorized();
            }

            var correo = JwtUserContext.GetCorreo(User) ?? "admin";
            var (ok, code, status, detail) = await _usuarioAdmin.ActivarAsync(id, adminId, correo, ct);
            if (!ok)
            {
                return Problem(detail: detail, statusCode: status, title: code,
                    extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
            }

            return NoContent();
        }

        /// <summary>
        /// Obtiene todos los Usuarios, con filtros opcionales.
        /// </summary>
        /// <param name="userId">Id de usuario (header "UserID").</param>
        /// <param name="windowName">Nombre de la aplicación (header "WindowName").</param>
        /// <param name="usuarioID">UsuarioID</param>
        /// <param name="correoUsuario">CorreoUsuario</param>
        /// <param name="perfilID">PerfilID</param>
        /// <param name="perfil">Perfil</param>
        /// <param name="bAdministrador">bAdministrador</param>
        /// <param name="nombreUsuario">NombreUsuario</param>
        /// <param name="telefonoUsuario">TelefonoUsuario</param>
        /// <param name="fotoUrlUsuario">FotoUrlUsuario</param>
        /// <param name="bActivoUsuario">bActivoUsuario</param>
        /// <param name="bEliminado">bEliminado</param>
        /// <param name="bActualizarPassword">bActualizarPassword</param>
        /// <returns>Listado de Usuarios</returns>
        [HttpGet]
        [Authorize(Policy = "SoloAdministrador")]
        [ProducesResponseType(typeof(IEnumerable<UsuarioPadronItemDto>), StatusCodes.Status200OK)]
        public async Task<IActionResult> ListarPadron(
            [FromQuery] string? perfil,
            [FromQuery] bool? bActivo,
            [FromQuery] bool incluirEliminados = false,
            CancellationToken ct = default)
        {
            var list = await _usuarioAdmin.ListarPadronAsync(perfil, bActivo, incluirEliminados, ct);
            return Ok(list);
        }

        [HttpGet("legacy")]
        [SwaggerOperation(
            Summary = "Listar Usuarios",
            Description = "Devuelve Usuarios aplicando filtros opcionales."
        )]
        [ProducesResponseType(typeof(IEnumerable<clReadUsuarios>), StatusCodes.Status200OK)]
        public async Task<ActionResult<IEnumerable<clReadUsuarios>>> GetAll(
            [FromHeader(Name = "UserID")] int nUserId,
            [FromHeader(Name = "WindowName")] string sWindowName,
            [FromQuery] int? usuarioID,
            [FromQuery] string? correoUsuario,
            [FromQuery] int? perfilID,
            [FromQuery] string? perfil,
            [FromQuery] bool? bAdministrador,
            [FromQuery] string? nombreUsuario,
            [FromQuery] string? telefonoUsuario,
            [FromQuery] string? fotoUrlUsuario,
            [FromQuery] bool? bActivoUsuario,
            [FromQuery] bool? bEliminado,
            [FromQuery] bool? bActualizarPassword,
            [FromQuery] string? columnNames)
        {
            var vList = await _objService.GetUsuariosDynamic(
                usuarioID,
                correoUsuario,
                perfilID,
                perfil,
                bAdministrador,
                nombreUsuario,
                telefonoUsuario,
                fotoUrlUsuario,
                bActivoUsuario,
                bEliminado,
                bActualizarPassword,
                columnNames, nUserId, sWindowName);
            return !vList.Any() ? NotFound() : Ok(vList);
        }

        /// <summary>
        /// Crea un nuevo Usuario.
        /// </summary>
        /// <param name="userId">Id de usuario (header "UserID").</param>
        /// <param name="windowName">Nombre de la aplicación (header "WindowName").</param>
        /// <param name="input">Datos del Usuario a crear.</param>
        /// <returns>El Usuario recién creado.</returns>
        [HttpPost]
        [Authorize(Policy = "SoloAdministrador")]
        [ProducesResponseType(typeof(UsuarioCreadoDto), StatusCodes.Status201Created)]
        public async Task<IActionResult> CrearUsuarioAdmin(
            [FromBody] CrearUsuarioAdminRequest request,
            CancellationToken ct)
        {
            if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            {
                return Unauthorized();
            }

            var validation = await _crearAdminValidator.ValidateAsync(request, ct);
            if (!validation.IsValid)
            {
                return ValidationProblem(new ValidationProblemDetails(
                    validation.Errors.GroupBy(e => e.PropertyName)
                        .ToDictionary(g => g.Key, g => g.Select(e => e.ErrorMessage).ToArray())));
            }

            var correo = JwtUserContext.GetCorreo(User) ?? "admin";
            var (data, code, status, detail) =
                await _usuarioAdmin.CrearAsync(request, adminId, correo, ct);

            if (data is null)
            {
                return Problem(detail: detail, statusCode: status, title: code,
                    extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
            }

            return Created($"/SGR/Usuarios/{data.UsuarioId}", data);
        }

        [HttpPost("legacy")]
        [SwaggerOperation(
            Summary = "Crear Usuarios",
            Description = "Inserta un nuevo Usuario en la base de datos."
        )]
        [ProducesResponseType(typeof(clReadUsuarios), StatusCodes.Status201Created)]
        public async Task<ActionResult<clReadUsuarios>> Create(
            [FromHeader(Name = "UserID")] int nUserId,
            [FromHeader(Name = "WindowName")] string sWindowName,
            [FromBody] clCreateUsuarios objInput)
        {
            var validation = await _createValidator.ValidateAsync(objInput);
            if (!validation.IsValid)
                return BadRequest(validation.Errors.Select(e => e.ErrorMessage));

            var vCreated = await _objService.CreateUsuarios(objInput, nUserId, sWindowName);
            return vCreated is null ? NoContent() : vCreated;
        }

        /// <summary>
        /// Actualización parcial de Usuario.
        /// </summary>
        /// <param name="userId">Id de usuario (header "UserID").</param>
        /// <param name="windowName">Nombre de la aplicación (header "WindowName").</param>
        /// <param name="input">Campos a actualizar y el ID del Usuario.</param>
        /// <returns>El Usuario actualizado.</returns>
        [HttpPatch("legacy")]
        [SwaggerOperation(
            Summary = "Actualizar Usuarios",
            Description = "Actualiza uno o varios campos de Usuario existente."
        )]
        [ProducesResponseType(typeof(clReadUsuarios), StatusCodes.Status200OK)]
        public async Task<ActionResult<clReadUsuarios>> Patch(
            [FromHeader(Name = "UserID")] int nUserId,
            [FromHeader(Name = "WindowName")] string sWindowName,
            [FromBody] clUpdateUsuarios objInput)
        {
            var validation = await _updateValidator.ValidateAsync(objInput);
            if (!validation.IsValid)
                return BadRequest(validation.Errors.Select(e => e.ErrorMessage));

            var vUpdated = await _objService.UpdateUsuarios(objInput, nUserId, sWindowName);
            return vUpdated is null ? NotFound() : Ok(vUpdated);
        }

        /// <summary>
        /// Elimina un Usuario por su ID.
        /// </summary>
        [HttpDelete("{id:int}")]
        [Authorize(Policy = "SoloAdministrador")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> Delete(int id, CancellationToken ct)
        {
            if (!JwtUserContext.TryGetUsuarioId(User, out var adminId))
            {
                return Unauthorized();
            }

            var correo = JwtUserContext.GetCorreo(User) ?? "admin";
            var (ok, code, status, detail) = await _usuarioAdmin.EliminarAsync(id, adminId, correo, ct);
            if (!ok)
            {
                return Problem(detail: detail, statusCode: status, title: code,
                    extensions: code is null ? null : new Dictionary<string, object?> { ["code"] = code });
            }

            return NoContent();
        }

        [HttpDelete("legacy/{nUsuariosID:int}")]
        [ProducesResponseType(StatusCodes.Status204NoContent)]
        public async Task<IActionResult> DeleteLegacy(int nUsuariosID)
        {
            var success = await _objService.DeleteUsuarios(nUsuariosID);
            return success ? NoContent() : NotFound();
        }
    }
}
