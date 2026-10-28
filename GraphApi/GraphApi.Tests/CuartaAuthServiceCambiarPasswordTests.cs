using System.Data;
using GraphApi.Infrastructure;
using GraphApi.Models.SGR.Auth;
using GraphApi.Repositories.SGR;
using GraphApi.Services.SGR.Auth;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using BC = BCrypt.Net.BCrypt;

namespace GraphApi.Tests;

public class CuartaAuthServiceCambiarPasswordTests
{
    private const string CurrentPassword = "actual1234";
    private readonly string _hash = BC.HashPassword(CurrentPassword);

    [Fact]
    public async Task CambiarPassword_wrong_current_returns_400()
    {
        var sut = CreateSut(out _, out _, out var refresh);
        var result = await sut.CambiarPasswordAsync(
            1,
            new CambiarPasswordRequest { PasswordActual = "mal", PasswordNueva = "nueva12345" });

        Assert.False(result.Ok);
        Assert.Equal(StatusCodes.Status400BadRequest, result.Status);
        Assert.Equal("INVALID_CURRENT_PASSWORD", result.ErrorCode);
        refresh.Verify(
            r => r.RevokeAllForUsuarioAsync(It.IsAny<int>(), It.IsAny<string>(), It.IsAny<IDbTransaction>()),
            Times.Never);
    }

    [Fact]
    public async Task CambiarPassword_success_revokes_all_refresh_tokens()
    {
        var sut = CreateSut(out var users, out var uow, out var refresh);
        users
            .Setup(u => u.UpdatePasswordAsync(1, It.IsAny<string>(), "u@test.com", It.IsAny<IDbTransaction>()))
            .ReturnsAsync(true);

        var result = await sut.CambiarPasswordAsync(
            1,
            new CambiarPasswordRequest
            {
                PasswordActual = CurrentPassword,
                PasswordNueva = "nueva12345",
            });

        Assert.True(result.Ok);
        Assert.Equal(StatusCodes.Status204NoContent, result.Status);
        refresh.Verify(r => r.RevokeAllForUsuarioAsync(1, "u@test.com", It.IsAny<IDbTransaction>()), Times.Once);
        uow.Verify(w => w.Commit(), Times.Once);
    }

    private CuartaAuthService CreateSut(
        out Mock<IUserRepository> users,
        out Mock<IUnitOfWork> uow,
        out Mock<IRefreshTokenRepository> refresh)
    {
        users = new Mock<IUserRepository>();
        users.Setup(u => u.FindByIdAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new UserAuthRow
            {
                UsuarioID = 1,
                Correo = "u@test.com",
                PasswordHash = _hash,
                bActivo = true,
                Perfil = "Residente",
                Nombre = "Test",
                RequiereCambioPassword = true,
            });

        refresh = new Mock<IRefreshTokenRepository>();
        var jwt = new Mock<IJwtTokenService>();
        uow = new Mock<IUnitOfWork>();
        var tx = new Mock<IDbTransaction>();
        uow.Setup(w => w.BeginTransaction()).Returns(tx.Object);

        return new CuartaAuthService(
            users.Object,
            refresh.Object,
            jwt.Object,
            uow.Object,
            NullLogger<CuartaAuthService>.Instance);
    }
}
