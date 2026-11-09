using GraphApi.Models.Security.AuthService;

namespace GraphApi.Services.Security.AuthService
{
    public interface IAuthService
    {
        /// <summary>
        /// Valida el usuario/contraseña y genera un JWT válido.
        /// </summary>
        /// <param name="request">Username y Password.</param>
        /// <returns>Token y fecha de expiración.</returns>
        Task<clAuthServiceResponse> Authenticate(clAuthServiceRequest objAuthServiceRequest);
    }
}
