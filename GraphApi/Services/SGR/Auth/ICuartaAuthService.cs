using GraphApi.Models.SGR.Auth;

namespace GraphApi.Services.SGR.Auth;

public interface ICuartaAuthService
{
    Task<(LoginResponse? Ok, string? RefreshPlain, string? ErrorCode, int Status)> LoginAsync(LoginRequest request, string clientIp, CancellationToken ct = default);
    Task<(LoginResponse? Ok, string? ErrorCode, int Status, string? NewRefreshPlain)> RefreshAsync(string? refreshPlain, string clientIp, CancellationToken ct = default);
    Task LogoutAsync(string? refreshPlain, CancellationToken ct = default);

    Task<(bool Ok, string? ErrorCode, int Status, string? Detail)> CambiarPasswordAsync(
        int usuarioId,
        CambiarPasswordRequest request,
        CancellationToken ct = default);
    string CreateRefreshPlainToken();
    string HashRefreshToken(string plain);
}
