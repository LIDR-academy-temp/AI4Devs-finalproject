using GraphApi.Infrastructure;
using Microsoft.AspNetCore.Http;
using GraphApi.Models.NTF;
using GraphApi.Repositories.NTF;
using GraphApi.Services.NTF;
using Moq;

namespace GraphApi.Tests;

public class NotificacionServiceTests
{
    [Fact]
    public async Task MarcarLeida_forbidden_when_not_owner()
    {
        var repo = new Mock<INotificacionRepository>();
        repo.Setup(r => r.GetPropiedadAsync(10, 5, It.IsAny<CancellationToken>()))
            .ReturnsAsync((true, false));

        var sut = new NotificacionService(repo.Object, Mock.Of<IUnitOfWork>());
        var (ok, code, status) = await sut.MarcarLeidaAsync(10, 5, "u@test.com");

        Assert.False(ok);
        Assert.Equal("FORBIDDEN", code);
        Assert.Equal(StatusCodes.Status403Forbidden, status);
    }

    [Fact]
    public async Task GetBandeja_clamps_page_size()
    {
        var repo = new Mock<INotificacionRepository>();
        repo
            .Setup(r => r.GetBandejaAsync(1, 1, 100, It.IsAny<CancellationToken>()))
            .ReturnsAsync((Array.Empty<NotificacionItemDto>(), 0));

        var sut = new NotificacionService(repo.Object, Mock.Of<IUnitOfWork>());
        var bandeja = await sut.GetBandejaAsync(1, 0, 500);

        Assert.Equal(1, bandeja.Pagina);
        Assert.Equal(100, bandeja.Tamano);
        repo.Verify(r => r.GetBandejaAsync(1, 1, 100, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task AvisoGeneralAsync_notifica_residentes_y_commit()
    {
        var repo = new Mock<INotificacionRepository>();
        var tx = Mock.Of<System.Data.IDbTransaction>();
        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(tx);
        repo.Setup(r => r.ResolveTipoIdAsync("AVISO_GENERAL", tx)).ReturnsAsync(7);
        repo.Setup(r => r.NotificarPerfilAsync(
                tx,
                "Residente",
                false,
                7,
                "T",
                "M",
                It.IsAny<NotificacionAutor>(),
                1))
            .ReturnsAsync(12);

        var sut = new NotificacionService(repo.Object, uow.Object);
        var autor = new NotificacionAutor(1, "admin@local");
        var count = await sut.AvisoGeneralAsync("T", "M", autor, CancellationToken.None, 1);

        Assert.Equal(12, count);
        uow.Verify(u => u.Commit(), Times.Once);
    }
}
