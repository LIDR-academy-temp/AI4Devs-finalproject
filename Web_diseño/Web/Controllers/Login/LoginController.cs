using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Authentication;
using Microsoft.AspNetCore.Authentication.Cookies;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Mvc;
using Microsoft.Extensions.Caching.Memory;
using System.Security.Claims;
using Web.Models.Admin;
using Web.Models.Login;
using Web.Services;

namespace Web.Controllers.Login
{
    [AllowAnonymous]
    public class LoginController : Controller
    {
        private readonly Web.Services.IGraphApiBackendService _backend;
        private readonly IConfiguration _configuration;
        private readonly IEmailService _email;
        private readonly IMemoryCache _cache;
        private readonly IResidentPortalService _residentPortal;
        private readonly IWebHostEnvironment _environment;

        public LoginController(
            Web.Services.IGraphApiBackendService backend,
            IConfiguration configuration,
            IEmailService email,
            IMemoryCache cache,
            IResidentPortalService residentPortal,
            IWebHostEnvironment environment)
        {
            _backend = backend;
            _configuration = configuration;
            _email = email;
            _cache = cache;
            _residentPortal = residentPortal;
            _environment = environment;
        }

        [HttpGet]
        public async Task<IActionResult> Login(string? returnUrl = null)
        {
            if (User.Identity?.IsAuthenticated == true)
            {
                if (!string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl))
                {
                    return Redirect(returnUrl);
                }

                return RedirectToAction("Index", "Home");
            }

            return View(await BuildLoginViewModelAsync(new LoginViewModel { ReturnUrl = returnUrl }));
        }

        [ValidateAntiForgeryToken]
        [HttpPost]
        public async Task<IActionResult> Login(LoginViewModel model)
        {
            var loginModel = await BuildLoginViewModelAsync(model);

            if (!ModelState.IsValid)
                return View(loginModel);

            try
            {
                var auth = await _backend.AuthenticateAsync(model.Username, model.Password);

                // Usar token del usuario para la consulta de perfil (no hay service credentials en dev)
                GraphQLService.SetBearer(auth.Token, auth.Expires);

                // Normalizar el correo a minúsculas: en mobile los teclados pueden auto-capitalizar
                // y la búsqueda en GraphQL es case-sensitive (eq).
                var correoNormalizado = model.Username.Trim().ToLowerInvariant();

                // Cargar perfil y permisos del usuario
                var perfilUsuario = await _backend.GetPerfilByCorreoAsync(correoNormalizado);
                return await CompleteSignInAsync(
                    perfilUsuario,
                    loginModel,
                    model.Username,
                    model.ReturnUrl,
                    auth.Token,
                    auth.Expires);
            }
            catch (Exception)
            {
                ModelState.AddModelError(string.Empty, "Usuario o contraseña inválidos.");
                return View(loginModel);
            }
        }

        [HttpGet("Login/DevSignIn")]
        public async Task<IActionResult> DevSignIn(string correo, int? condominioId = null, string? returnUrl = null)
        {
            if (!_environment.IsDevelopment())
            {
                return NotFound();
            }

            if (string.IsNullOrWhiteSpace(correo))
            {
                return BadRequest("El correo es obligatorio.");
            }

            var correoNormalizado = correo.Trim().ToLowerInvariant();
            var loginModel = BuildDevelopmentLoginModel(correoNormalizado, condominioId, returnUrl);
            PerfilViewModel? perfilUsuario;

            try
            {
                var signInData = await ExecuteWithoutCurrentBackendTokenAsync(async () =>
                {
                    var resolvedLoginModel = await BuildLoginViewModelAsync(new LoginViewModel
                    {
                        Username = correoNormalizado,
                        ReturnUrl = returnUrl,
                        CondominioID = condominioId ?? 0
                    });

                    var resolvedPerfilUsuario = await _backend.GetPerfilByCorreoAsync(correoNormalizado);
                    return (resolvedLoginModel, resolvedPerfilUsuario);
                });

                loginModel = signInData.resolvedLoginModel;
                perfilUsuario = signInData.resolvedPerfilUsuario;
            }
            catch (InvalidOperationException) when (TryBuildDevelopmentProfile(correoNormalizado) is not null)
            {
                perfilUsuario = TryBuildDevelopmentProfile(correoNormalizado);
            }

            if (perfilUsuario?.UsuarioID is null or <= 0)
            {
                return NotFound();
            }

            var developmentToken = await TryGetDevelopmentBackendTokenAsync(correoNormalizado);

            return await CompleteSignInAsync(
                perfilUsuario,
                loginModel,
                correoNormalizado,
                returnUrl,
                developmentToken.Token,
                developmentToken.Expires,
                bypassResidentPropertyCheck: true);
        }

        [HttpGet]
        public async Task<IActionResult> Logout()
        {
            await HttpContext.SignOutAsync();
            return new RedirectToActionResult(nameof(Login), "Login", null);
        }

        [HttpGet]
        public IActionResult Denied() => View();

        [HttpGet]
        public IActionResult ForgotPassword() => View(new LoginForgotViewModel());

        [HttpPost]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ForgotPassword(LoginForgotViewModel model)
        {
            if (!ModelState.IsValid) return View(model);

            // Siempre mostrar el mismo mensaje para no revelar si el correo existe
            TempData["Msg"] = "Si el correo está registrado, recibirás un enlace para restablecer tu contraseña.";

            try
            {
                var perfil = await _backend.GetPerfilByCorreoAsync(model.EmailForgot.Trim());
                if (perfil?.UsuarioID is not null)
                {
                    var token    = Convert.ToBase64String(System.Security.Cryptography.RandomNumberGenerator.GetBytes(32))
                                       .Replace('+', '-').Replace('/', '_').TrimEnd('=');
                    var cacheKey = $"pwd_reset_{token}";

                    // Guardar: token → (usuarioId, correo) por 30 minutos
                    _cache.Set(cacheKey, (perfil.UsuarioID.Value, perfil.CorreoUsuario),
                        TimeSpan.FromMinutes(30));

                    var resetUrl  = Url.Action("ResetPassword", "Login",
                        new { token }, Request.Scheme, Request.Host.Value)!;
                    var htmlBody  = $"""
                        <div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
                          <h2 style="color:#1976d2">Restablecer contraseña</h2>
                          <p>Hola <strong>{perfil.NombreUsuario}</strong>,</p>
                          <p>Recibimos una solicitud para restablecer tu contraseña. Haz clic en el botón para continuar.</p>
                          <p style="margin:24px 0">
                            <a href="{resetUrl}"
                               style="padding:12px 28px;background:#1976d2;color:#fff;text-decoration:none;border-radius:6px;font-weight:bold">
                              Restablecer contraseña
                            </a>
                          </p>
                          <p>O copia este enlace en tu navegador:<br/>
                            <small style="color:#555;word-break:break-all">{resetUrl}</small></p>
                          <p style="color:#888;font-size:.85em">Este enlace expira en 30 minutos. Si no solicitaste esto, ignora este correo.</p>
                        </div>
                        """;

                    await _email.SendAsync(
                        perfil.CorreoUsuario,
                        perfil.NombreUsuario,
                        "Restablece tu contraseña — Cuarta Quinientos",
                        htmlBody);
                }
            }
            catch
            {
                // Silencioso — no revelar error al usuario
            }

            return new RedirectToActionResult(nameof(Login), "Login", null);
        }

        [HttpGet("Login/ResetPassword")]
        public IActionResult ResetPassword(string? token)
        {
            if (string.IsNullOrWhiteSpace(token) ||
                !_cache.TryGetValue($"pwd_reset_{token}", out _))
            {
                TempData["Msg"] = "El enlace es inválido o ha expirado. Solicita uno nuevo.";
                return RedirectToAction(nameof(Login));
            }

            return View("~/Views/Login/ResetPassword.cshtml",
                new ResetPasswordViewModel { Token = token });
        }

        [HttpPost("Login/ResetPassword")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> ResetPassword(ResetPasswordViewModel model)
        {
            if (!ModelState.IsValid)
                return View("~/Views/Login/ResetPassword.cshtml", model);

            var cacheKey = $"pwd_reset_{model.Token}";
            if (!_cache.TryGetValue(cacheKey, out (int usuarioId, string correo) entry))
            {
                ModelState.AddModelError("", "El enlace es inválido o ha expirado. Solicita uno nuevo.");
                return View("~/Views/Login/ResetPassword.cshtml", model);
            }

            try
            {
                await _backend.CambiarPasswordAsync(entry.usuarioId, model.PasswordNuevo);
                _cache.Remove(cacheKey);
                TempData["Msg"] = "Contraseña actualizada correctamente. Ya puedes iniciar sesión.";
            }
            catch (Exception ex)
            {
                ModelState.AddModelError("", $"Error al actualizar la contraseña: {ex.Message}");
                return View("~/Views/Login/ResetPassword.cshtml", model);
            }

            return RedirectToAction(nameof(Login));
        }

        private async Task<LoginViewModel> BuildLoginViewModelAsync(LoginViewModel model)
        {
            var condominios = await LoadCondominiosAsync();
            var defaultCondominioName = _configuration["WebDefaults:DefaultCondominioName"] ?? "Cuarta Quinientos";

            var selectedCondominio = ResolveSelectedCondominio(condominios, model.CondominioID, defaultCondominioName);

            if (selectedCondominio.CondominioID.HasValue && selectedCondominio.CondominioID.Value > 0)
            {
                model.CondominioID = selectedCondominio.CondominioID.Value;
            }

            model.SelectedCondominioName = string.IsNullOrWhiteSpace(selectedCondominio.NombreCondominio)
                ? defaultCondominioName
                : selectedCondominio.NombreCondominio;

            var optionsSource = condominios.Count > 0
                ? condominios
                : new List<CondominioFormViewModel> { selectedCondominio };

            model.CondominioOptions = CotoContext.BuildCondominioOptions(optionsSource, model.CondominioID);
            return model;
        }

        private async Task<List<CondominioFormViewModel>> LoadCondominiosAsync()
        {
            try
            {
                return (await _backend.GetCondominiosAsync())
                    .Where(item => item.bEliminado != true)
                    .ToList();
            }
            catch
            {
                return new List<CondominioFormViewModel>();
            }
        }

        private static CondominioFormViewModel ResolveSelectedCondominio(
            IReadOnlyList<CondominioFormViewModel> condominios,
            int selectedCondominioId,
            string defaultCondominioName)
        {
            if (selectedCondominioId > 0)
            {
                var selectedById = condominios.FirstOrDefault(item => item.CondominioID == selectedCondominioId);
                if (selectedById is not null)
                {
                    return selectedById;
                }

                return new CondominioFormViewModel
                {
                    CondominioID = selectedCondominioId,
                    NombreCondominio = defaultCondominioName
                };
            }

            var selectedByName = condominios.FirstOrDefault(item =>
                string.Equals(item.NombreCondominio?.Trim(), defaultCondominioName.Trim(), StringComparison.OrdinalIgnoreCase));

            if (selectedByName is not null)
            {
                return selectedByName;
            }

            return condominios.FirstOrDefault(item => item.CondominioID.HasValue)
                ?? new CondominioFormViewModel
                {
                    CondominioID = 0,
                    NombreCondominio = defaultCondominioName
                };
        }

        private async Task<IActionResult> CompleteSignInAsync(
            PerfilViewModel? perfilUsuario,
            LoginViewModel loginModel,
            string username,
            string? returnUrl,
            string? backendToken = null,
            DateTime? backendTokenExpires = null,
            bool bypassResidentPropertyCheck = false)
        {
            var claims = new List<Claim>
            {
                new Claim(ClaimTypes.Name, username),
                new Claim(ClaimTypes.NameIdentifier, username),
                new Claim(ClaimTypes.Role, "Admin"),
                new Claim(CotoContext.DisplayNameClaim, loginModel.SelectedCondominioName),
                new Claim(CotoContext.SelectedCondominioNameClaim, loginModel.SelectedCondominioName),
                new Claim(CotoContext.PerfilIdClaim, (perfilUsuario?.PerfilID ?? 0).ToString()),
                new Claim(CotoContext.EsAdminClaim, (perfilUsuario?.bAdministrador ?? false).ToString().ToLowerInvariant()),
                new Claim(CotoContext.UsuarioIdClaim, (perfilUsuario?.UsuarioID ?? 0).ToString()),
                new Claim(CotoContext.NombreUsuarioClaim, perfilUsuario?.NombreUsuario ?? username),
                new Claim(CotoContext.FotoUrlClaim, perfilUsuario?.FotoUrlUsuario ?? string.Empty),
            };

            if (!string.IsNullOrWhiteSpace(backendToken))
            {
                claims.Add(new Claim("backend_token", backendToken));
            }

            if (backendTokenExpires.HasValue)
            {
                claims.Add(new Claim("backend_token_expires", backendTokenExpires.Value.ToString("O")));
            }

            if (loginModel.CondominioID > 0)
            {
                claims.Add(CotoContext.BuildSelectedCondominioIdClaim(loginModel.CondominioID));
            }

            var identity = new ClaimsIdentity(claims, CookieAuthenticationDefaults.AuthenticationScheme);
            var principal = new ClaimsPrincipal(identity);

            await HttpContext.SignInAsync(CookieAuthenticationDefaults.AuthenticationScheme, principal);

            if (perfilUsuario?.bActualizarPassword == true)
            {
                TempData["MustChangePassword"] = "1";
                return (perfilUsuario?.bAdministrador ?? false)
                    ? RedirectToAction("Index", "Perfil", new { area = "" })
                    : RedirectToAction("Index", "Perfil", new { area = "Residente" });
            }

            var safeReturnUrl = !string.IsNullOrWhiteSpace(returnUrl) && Url.IsLocalUrl(returnUrl)
                ? returnUrl
                : null;

            if (!(perfilUsuario?.bAdministrador ?? false)
                && (bypassResidentPropertyCheck || await _residentPortal.HasResidentPropertiesAsync(perfilUsuario?.UsuarioID ?? 0)))
            {
                var residentReturnUrl = !string.IsNullOrWhiteSpace(safeReturnUrl)
                    && safeReturnUrl.StartsWith("/Residente", StringComparison.OrdinalIgnoreCase)
                    ? safeReturnUrl
                    : null;
                return RedirectToAction("Index", "Acceso", new { area = "", returnUrl = residentReturnUrl });
            }

            if (!string.IsNullOrWhiteSpace(safeReturnUrl))
            {
                return Redirect(safeReturnUrl);
            }

            return new RedirectToActionResult("Index", "Home", null);
        }

        private LoginViewModel BuildDevelopmentLoginModel(string username, int? condominioId, string? returnUrl)
        {
            return new LoginViewModel
            {
                Username = username,
                ReturnUrl = returnUrl,
                CondominioID = condominioId.GetValueOrDefault() > 0 ? condominioId!.Value : 1,
                SelectedCondominioName = _configuration["WebDefaults:DefaultCondominioName"] ?? "Cuarta Quinientos"
            };
        }

        private static PerfilViewModel? TryBuildDevelopmentProfile(string correo)
        {
            return correo switch
            {
                "dusvaan@gmail.com" => new PerfilViewModel
                {
                    UsuarioID = 1,
                    PerfilID = 1,
                    NombreUsuario = "ariel",
                    CorreoUsuario = "dusvaan@gmail.com",
                    bAdministrador = true
                },
                "casa0@cq500.local" => new PerfilViewModel
                {
                    UsuarioID = 4,
                    PerfilID = 3,
                    NombreUsuario = "Residente Validacion",
                    CorreoUsuario = "casa0@cq500.local",
                    bAdministrador = false
                },
                _ => null
            };
        }

        private async Task<(string? Token, DateTime? Expires)> TryGetDevelopmentBackendTokenAsync(string correo)
        {
            var seedPassword = TryGetDevelopmentSeedPassword(correo);
            if (!string.IsNullOrWhiteSpace(seedPassword))
            {
                try
                {
                    var seedAuth = await _backend.AuthenticateAsync(correo, seedPassword);
                    return (seedAuth.Token, seedAuth.Expires);
                }
                catch
                {
                }
            }

            var serviceUser = _configuration["GraphApi:ServiceUser"];
            var servicePassword = _configuration["GraphApi:ServicePassword"];
            if (string.IsNullOrWhiteSpace(serviceUser) || string.IsNullOrWhiteSpace(servicePassword))
            {
                return (null, null);
            }

            try
            {
                var serviceAuth = await GraphQLService.AuthenticateAsync(serviceUser, servicePassword);
                return (serviceAuth.Token, serviceAuth.Expires);
            }
            catch
            {
                return (null, null);
            }
        }

        private static string? TryGetDevelopmentSeedPassword(string correo)
        {
            return correo switch
            {
                "dusvaan@gmail.com" => "Admin2026",
                "soporte@cq500.local" => "123456",
                "gojorge3d91@gmail.com" => "123456",
                "casa0@cq500.local" => "123456",
                "andres@gmail.com" => "123456",
                "lilia@gmail.com" => "123456",
                _ => null
            };
        }

        private async Task<T> ExecuteWithoutCurrentBackendTokenAsync<T>(Func<Task<T>> action)
        {
            var originalUser = HttpContext.User;
            GraphQLService.Reset();
            HttpContext.User = new ClaimsPrincipal(new ClaimsIdentity());

            try
            {
                var serviceUser = _configuration["GraphApi:ServiceUser"];
                var servicePassword = _configuration["GraphApi:ServicePassword"];
                if (!string.IsNullOrWhiteSpace(serviceUser) && !string.IsNullOrWhiteSpace(servicePassword))
                {
                    var serviceAuth = await GraphQLService.AuthenticateAsync(serviceUser, servicePassword);
                    GraphQLService.SetBearer(serviceAuth.Token, new DateTimeOffset(serviceAuth.Expires));
                }

                return await action();
            }
            finally
            {
                HttpContext.User = originalUser;
            }
        }
    }
}