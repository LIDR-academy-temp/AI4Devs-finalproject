using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using FluentValidation;
using GraphApi.Models.SGR.Auth;
using GraphApi.Services.SGR.Auth;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.RateLimiting;

namespace GraphApi.Controllers.SGR;

[ApiController]
[Route("SGR/[controller]")]
[Produces("application/json")]
public class AuthServiceController : ControllerBase
{
    public const string RefreshCookieName = "rt";
    private readonly ICuartaAuthService _auth;
    private readonly IValidator<LoginRequest> _loginValidator;
    private readonly IValidator<CambiarPasswordRequest> _cambiarValidator;
    private readonly IWebHostEnvironment _env;

    public AuthServiceController(
        ICuartaAuthService auth,
        IValidator<LoginRequest> loginValidator,
        IValidator<CambiarPasswordRequest> cambiarValidator,
        IWebHostEnvironment env)
    {
        _auth = auth;
        _loginValidator = loginValidator;
        _cambiarValidator = cambiarValidator;
        _env = env;
    }

    [HttpPost("GenerateToken")]
    [AllowAnonymous]
    [EnableRateLimiting("login")]
    [ProducesResponseType(typeof(LoginResponse), StatusCodes.Status200OK)]
    public async Task<IActionResult> GenerateToken([FromBody] LoginRequest request, CancellationToken ct)
    {
        var validation = await _loginValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return Problem(
                detail: string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)),
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var (ok, refreshPlain, code, status) = await _auth.LoginAsync(request, ip, ct);
        if (ok is null || refreshPlain is null)
        {
            return Problem(
                detail: "Credenciales inválidas",
                statusCode: status,
                title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        AppendRefreshCookie(refreshPlain);
        return Ok(ok);
    }

    [HttpPost("RefreshToken")]
    [AllowAnonymous]
    public async Task<IActionResult> RefreshToken(CancellationToken ct)
    {
        Request.Cookies.TryGetValue(RefreshCookieName, out var rt);
        var ip = HttpContext.Connection.RemoteIpAddress?.ToString() ?? "unknown";
        var (ok, code, status, newPlain) = await _auth.RefreshAsync(rt, ip, ct);
        if (ok is null || newPlain is null)
        {
            return Problem(
                detail: "Sesión inválida",
                statusCode: status,
                title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        AppendRefreshCookie(newPlain);
        return Ok(ok);
    }

    [HttpPost("CambiarPassword")]
    [Authorize]
    [ProducesResponseType(StatusCodes.Status204NoContent)]
    public async Task<IActionResult> CambiarPassword([FromBody] CambiarPasswordRequest request, CancellationToken ct)
    {
        var validation = await _cambiarValidator.ValidateAsync(request, ct);
        if (!validation.IsValid)
        {
            return Problem(
                detail: string.Join("; ", validation.Errors.Select(e => e.ErrorMessage)),
                statusCode: StatusCodes.Status400BadRequest,
                title: "VALIDATION_ERROR",
                extensions: new Dictionary<string, object?> { ["code"] = "VALIDATION_ERROR" });
        }

        if (!TryGetUsuarioId(out var usuarioId))
        {
            return Unauthorized();
        }

        var (ok, code, status, detail) = await _auth.CambiarPasswordAsync(usuarioId, request, ct);
        if (!ok)
        {
            return Problem(
                detail: detail ?? "No se pudo cambiar la contraseña",
                statusCode: status,
                title: code,
                extensions: new Dictionary<string, object?> { ["code"] = code });
        }

        Response.Cookies.Delete(RefreshCookieName);
        return NoContent();
    }

    [HttpPost("Logout")]
    [Authorize]
    public async Task<IActionResult> Logout(CancellationToken ct)
    {
        Request.Cookies.TryGetValue(RefreshCookieName, out var rt);
        await _auth.LogoutAsync(rt, ct);
        Response.Cookies.Delete(RefreshCookieName);
        return NoContent();
    }

    private bool TryGetUsuarioId(out int usuarioId)
    {
        var sub = User.FindFirstValue(ClaimTypes.NameIdentifier)
            ?? User.FindFirstValue(JwtRegisteredClaimNames.Sub);
        return int.TryParse(sub, out usuarioId);
    }

    private void AppendRefreshCookie(string refreshPlain)
    {
        Response.Cookies.Append(RefreshCookieName, refreshPlain, new CookieOptions
        {
            HttpOnly = true,
            Secure = !_env.IsDevelopment(),
            SameSite = SameSiteMode.Strict,
            Expires = DateTimeOffset.UtcNow.AddDays(14),
            Path = "/"
        });
    }
}
