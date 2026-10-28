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
}
