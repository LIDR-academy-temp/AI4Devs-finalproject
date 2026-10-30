using System.Data;
using GraphApi.Infrastructure;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.SGR.Usuarios;
using Microsoft.AspNetCore.Http;
using GraphApi.Repositories.SGR;
using GraphApi.Services.SGR.Usuarios;
using Moq;

namespace GraphApi.Tests;

public class CuartaUsuarioAdminServiceTests
{
    [Fact]
    public async Task Crear_duplicate_correo_returns_409()
    {
        var repo = new Mock<IUsuarioAdminRepository>();
        repo.Setup(r => r.ExisteCorreoAsync("dup@test.com", It.IsAny<CancellationToken>()))
            .ReturnsAsync(true);

        var sut = new CuartaUsuarioAdminService(
            repo.Object,
            Mock.Of<IRefreshTokenRepository>(),
            Mock.Of<IPasswordGenerator>(),
            Mock.Of<IUnitOfWork>());

        var (data, code, status, _) = await sut.CrearAsync(
            new CrearUsuarioAdminRequest
            {
                Nombre = "A",
                Correo = "dup@test.com",
                Perfil = "Residente",
            },
            1,
            "admin@test.com");

        Assert.Null(data);
        Assert.Equal("CONFLICT", code);
        Assert.Equal(StatusCodes.Status409Conflict, status);
    }

    [Fact]
    public async Task ActualizarAdminExtras_resolves_perfil_before_transaction()
    {
        var repo = new Mock<IUsuarioAdminRepository>();
        repo.Setup(r => r.ResolverPerfilIdAsync("Residente", It.IsAny<CancellationToken>()))
            .ReturnsAsync(2);
        repo.Setup(r => r.ActualizarPerfilIdAsync(5, 2, It.IsAny<string>(), 1, It.IsAny<IDbTransaction>()))
            .ReturnsAsync(true);

        var tx = new Mock<IDbTransaction>();
        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(tx.Object);

        var sut = new CuartaUsuarioAdminService(
            repo.Object,
            Mock.Of<IRefreshTokenRepository>(),
            Mock.Of<IPasswordGenerator>(),
            uow.Object);

        var (ok, code, status, _) = await sut.ActualizarAdminExtrasAsync(
            5, "Residente", null, 1, "admin@test.com");

        Assert.True(ok);
        Assert.Null(code);
        Assert.Equal(StatusCodes.Status200OK, status);
        repo.Verify(r => r.ResolverPerfilIdAsync("Residente", It.IsAny<CancellationToken>()), Times.Once);
        uow.Verify(u => u.BeginTransaction(), Times.Once);
    }
}
