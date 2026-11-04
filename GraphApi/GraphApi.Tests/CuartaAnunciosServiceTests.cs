using GraphApi.Infrastructure;
using GraphApi.Models.ANM.Anuncios;
using GraphApi.Models.NTF;
using GraphApi.Repositories.ANM;
using GraphApi.Services.ANM.Anuncios;
using GraphApi.Services.NTF;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace GraphApi.Tests;

public class CuartaAnunciosServiceTests
{
    [Fact]
    public async Task CrearAsync_tipo_invalido_devuelve_TIPO_ANUNCIO_INVALIDO()
    {
        var repo = new Mock<ICuartaAnunciosRepository>();
        repo.Setup(r => r.ResolverTipoIdAsync("X", It.IsAny<System.Data.IDbTransaction>()))
            .ReturnsAsync((int?)null);

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(Mock.Of<System.Data.IDbTransaction>());

        var sut = new CuartaAnunciosService(
            repo.Object,
            uow.Object,
            Mock.Of<INotificacionService>(),
            NullLogger<CuartaAnunciosService>.Instance);

        var (data, code, status, _) = await sut.CrearAsync(
            new AnuncioCrearRequest { Titulo = "t", Contenido = "c", TipoAnuncio = "X" },
            1,
            "admin@local");

        Assert.Null(data);
        Assert.Equal("TIPO_ANUNCIO_INVALIDO", code);
        Assert.Equal(StatusCodes.Status400BadRequest, status);
    }

    [Fact]
    public async Task MarcarVistoAsync_anuncio_no_vigente_404()
    {
        var repo = new Mock<ICuartaAnunciosRepository>();
        repo.Setup(r => r.AnuncioVigenteAsync(9, It.IsAny<CancellationToken>())).ReturnsAsync(false);

        var sut = new CuartaAnunciosService(
            repo.Object,
            Mock.Of<IUnitOfWork>(),
            Mock.Of<INotificacionService>(),
            NullLogger<CuartaAnunciosService>.Instance);

        var (ok, code, status, _) = await sut.MarcarVistoAsync(9, 2, "u@t.com");
        Assert.False(ok);
        Assert.Equal("NOT_FOUND", code);
        Assert.Equal(StatusCodes.Status404NotFound, status);
    }

    [Fact]
    public async Task CrearAsync_ok_notifica_aviso_general()
    {
        var repo = new Mock<ICuartaAnunciosRepository>();
        repo.Setup(r => r.ResolverTipoIdAsync("General", It.IsAny<System.Data.IDbTransaction>())).ReturnsAsync(1);
        repo.Setup(r => r.InsertAsync(It.IsAny<string>(), It.IsAny<string>(), 1, null, "a@l", 1, It.IsAny<System.Data.IDbTransaction>()))
            .ReturnsAsync(5);
        repo.Setup(r => r.ObtenerAsync(5, 1, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AnuncioListItemDto { AnuncioId = 5, Titulo = "t" });

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(Mock.Of<System.Data.IDbTransaction>());

        var ntf = new Mock<INotificacionService>();
        ntf.Setup(n => n.AvisoGeneralAsync("t", "c", It.IsAny<NotificacionAutor>(), It.IsAny<CancellationToken>(), It.IsAny<int?>()))
            .ReturnsAsync(3);

        var sut = new CuartaAnunciosService(repo.Object, uow.Object, ntf.Object, NullLogger<CuartaAnunciosService>.Instance);
        var (data, code, status, _) = await sut.CrearAsync(
            new AnuncioCrearRequest { Titulo = "t", Contenido = "c", TipoAnuncio = "General" },
            1,
            "a@l");

        Assert.NotNull(data);
        Assert.Null(code);
        Assert.Equal(StatusCodes.Status201Created, status);
        ntf.Verify(n => n.AvisoGeneralAsync("t", "c", It.IsAny<NotificacionAutor>(), It.IsAny<CancellationToken>(), It.IsAny<int?>()), Times.Once);
    }

    [Fact]
    public async Task ListarAsync_residente_pasa_incluirNoVigentes_false_al_repo()
    {
        var repo = new Mock<ICuartaAnunciosRepository>();
        repo.Setup(r => r.ListarAsync(2, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(Array.Empty<AnuncioListItemDto>());

        var sut = new CuartaAnunciosService(
            repo.Object,
            Mock.Of<IUnitOfWork>(),
            Mock.Of<INotificacionService>(),
            NullLogger<CuartaAnunciosService>.Instance);

        await sut.ListarAsync(2, incluirNoVigentes: false);

        repo.Verify(r => r.ListarAsync(2, false, It.IsAny<CancellationToken>()), Times.Once);
    }

    [Fact]
    public async Task MarcarVistoAsync_dos_veces_invoca_repo_dos_veces()
    {
        var repo = new Mock<ICuartaAnunciosRepository>();
        repo.Setup(r => r.AnuncioVigenteAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(true);

        var tx = Mock.Of<System.Data.IDbTransaction>();
        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(tx);

        var sut = new CuartaAnunciosService(
            repo.Object,
            uow.Object,
            Mock.Of<INotificacionService>(),
            NullLogger<CuartaAnunciosService>.Instance);

        await sut.MarcarVistoAsync(1, 2, "u@t.com");
        await sut.MarcarVistoAsync(1, 2, "u@t.com");

        repo.Verify(
            r => r.MarcarVistoAsync(1, 2, "u@t.com", tx),
            Times.Exactly(2));
    }

    [Fact]
    public async Task ActualizarAsync_sin_vigenteHasta_no_actualiza_vigencia_en_repo()
    {
        var repo = new Mock<ICuartaAnunciosRepository>();
        var tx = Mock.Of<System.Data.IDbTransaction>();
        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(tx);

        repo.Setup(r => r.UpdateAsync(
                3,
                "nuevo",
                null,
                null,
                null,
                false,
                "a@l",
                1,
                tx))
            .ReturnsAsync(true);
        repo.Setup(r => r.ObtenerAsync(3, 1, false, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AnuncioListItemDto { AnuncioId = 3, Titulo = "nuevo" });

        var sut = new CuartaAnunciosService(
            repo.Object,
            uow.Object,
            Mock.Of<INotificacionService>(),
            NullLogger<CuartaAnunciosService>.Instance);

        var (data, code, status, _) = await sut.ActualizarAsync(
            3,
            new AnuncioActualizarRequest { Titulo = "nuevo", VigenteHastaEspecificado = false },
            1,
            "a@l");

        Assert.NotNull(data);
        Assert.Null(code);
        Assert.Equal(StatusCodes.Status200OK, status);
        repo.Verify(
            r => r.UpdateAsync(3, "nuevo", null, null, null, false, "a@l", 1, tx),
            Times.Once);
    }
}
