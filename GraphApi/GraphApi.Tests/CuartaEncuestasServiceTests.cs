using GraphApi.Infrastructure;
using GraphApi.Models.ENC.Encuestas;
using GraphApi.Models.NTF;
using GraphApi.Repositories.ENC;
using GraphApi.Services.ENC.Encuestas;
using GraphApi.Services.NTF;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace GraphApi.Tests;

public class CuartaEncuestasServiceTests
{
    [Fact]
    public async Task CrearAsync_tipo_invalido_devuelve_TIPO_PREGUNTA_INVALIDO()
    {
        var repo = new Mock<ICuartaEncuestasRepository>();
        repo.Setup(r => r.ResolverTipoPreguntaIdAsync("X", null)).ReturnsAsync((int?)null);

        var sut = new CuartaEncuestasService(
            repo.Object,
            Mock.Of<IUnitOfWork>(),
            Mock.Of<INotificacionService>(),
            NullLogger<CuartaEncuestasService>.Instance);

        var (data, code, status, _) = await sut.CrearAsync(
            new EncuestaCrearRequest
            {
                Titulo = "t",
                FechaInicio = DateTime.UtcNow,
                Preguntas = new List<PreguntaCrearRequest>
                {
                    new() { Texto = "p", TipoPregunta = "X", Orden = 1 },
                },
            },
            1,
            "admin@local");

        Assert.Null(data);
        Assert.Equal("TIPO_PREGUNTA_INVALIDO", code);
        Assert.Equal(StatusCodes.Status400BadRequest, status);
    }

    [Fact]
    public async Task RegistrarRespuestasAsync_ya_participo_409()
    {
        var repo = new Mock<ICuartaEncuestasRepository>();
        repo.Setup(r => r.EstadoEncuestaAsync(1, null)).ReturnsAsync((true, true));
        repo.Setup(r => r.UsuarioYaParticipoAsync(1, 2, null)).ReturnsAsync(true);

        var sut = new CuartaEncuestasService(
            repo.Object,
            Mock.Of<IUnitOfWork>(),
            Mock.Of<INotificacionService>(),
            NullLogger<CuartaEncuestasService>.Instance);

        var (ok, code, status, _) = await sut.RegistrarRespuestasAsync(
            1,
            2,
            "r@local",
            new EncuestaResponderRequest
            {
                Respuestas = new List<RespuestaItemRequest> { new() { PreguntaId = 1, OpcionPreguntaId = 1 } },
            });

        Assert.False(ok);
        Assert.Equal("YA_PARTICIPO", code);
        Assert.Equal(StatusCodes.Status409Conflict, status);
    }

    [Fact]
    public async Task RegistrarRespuestasAsync_cerrada_422()
    {
        var repo = new Mock<ICuartaEncuestasRepository>();
        repo.Setup(r => r.EstadoEncuestaAsync(1, null)).ReturnsAsync((false, true));

        var sut = new CuartaEncuestasService(
            repo.Object,
            Mock.Of<IUnitOfWork>(),
            Mock.Of<INotificacionService>(),
            NullLogger<CuartaEncuestasService>.Instance);

        var (ok, code, status, _) = await sut.RegistrarRespuestasAsync(
            1,
            2,
            "r@local",
            new EncuestaResponderRequest { Respuestas = new List<RespuestaItemRequest>() });

        Assert.False(ok);
        Assert.Equal("ENCUESTA_CERRADA", code);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, status);
    }

    [Fact]
    public async Task PublicarAsync_sin_preguntas_422()
    {
        var repo = new Mock<ICuartaEncuestasRepository>();
        repo.Setup(r => r.ContarPreguntasAsync(1, null)).ReturnsAsync(0);

        var sut = new CuartaEncuestasService(
            repo.Object,
            Mock.Of<IUnitOfWork>(),
            Mock.Of<INotificacionService>(),
            NullLogger<CuartaEncuestasService>.Instance);

        var (ok, code, status, _) = await sut.PublicarAsync(1, 1, "a@l");
        Assert.False(ok);
        Assert.Equal("SIN_PREGUNTAS", code);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, status);
    }

    [Fact]
    public async Task PublicarAsync_ok_dispara_aviso_general()
    {
        var repo = new Mock<ICuartaEncuestasRepository>();
        repo.Setup(r => r.ContarPreguntasAsync(3, null)).ReturnsAsync(1);
        repo.Setup(r => r.PublicarAsync(3, "a@l", 1, It.IsAny<System.Data.IDbTransaction>())).ReturnsAsync(true);
        repo.Setup(r => r.ObtenerDetalleAsync(3, 1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new EncuestaDetalleDto { EncuestaId = 3, Titulo = "Enc" });

        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(Mock.Of<System.Data.IDbTransaction>());

        var ntf = new Mock<INotificacionService>();
        ntf.Setup(n => n.AvisoGeneralAsync("Enc", It.IsAny<string>(), It.IsAny<NotificacionAutor>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(1);

        var sut = new CuartaEncuestasService(repo.Object, uow.Object, ntf.Object, NullLogger<CuartaEncuestasService>.Instance);
        var (ok, code, status, _) = await sut.PublicarAsync(3, 1, "a@l");

        Assert.True(ok);
        Assert.Null(code);
        Assert.Equal(StatusCodes.Status204NoContent, status);
        ntf.Verify(n => n.AvisoGeneralAsync("Enc", It.IsAny<string>(), It.IsAny<NotificacionAutor>(), It.IsAny<CancellationToken>()), Times.Once);
    }
}
