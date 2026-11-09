using GraphApi.Models.FNZ;
using GraphApi.Repositories.FNZ;
using GraphApi.Services.FNZ;
using Microsoft.AspNetCore.Http;
using Moq;

namespace GraphApi.Tests;

public class FinanzasServiceMorasTests
{
    private static FinanzasService CreateSut(Mock<IMorososRepository> morosos)
    {
        return new FinanzasService(
            new Mock<ICuotaEstadoCuentaRepository>().Object,
            new Mock<ICuotaGeneracionRepository>().Object,
            new Mock<ITiposCuentaFnzRepository>().Object,
            new Mock<ITiposMovimientoFnzRepository>().Object,
            new Mock<ITransaccionesFnzRepository>().Object,
            new Mock<ICuotaPagoRepository>().Object,
            morosos.Object,
            new Mock<GraphApi.Services.NTF.INotificacionService>().Object,
            new Mock<GraphApi.Infrastructure.IUnitOfWork>().Object,
            new FixedTimeProvider(new DateTimeOffset(2026, 10, 16, 18, 0, 0, TimeSpan.Zero)));
    }

    [Fact]
    public async Task AplicarMoras_returns_422_when_column_missing()
    {
        var morosos = new Mock<IMorososRepository>();
        morosos.SetupGet(m => m.TieneColumnaMontoMora).Returns(false);
        var sut = CreateSut(morosos);

        var (data, code, status, _) = await sut.AplicarMorasMorososAsync(
            new AplicarMorasRequest
            {
                MontoMora = 50m,
                Residentes = [new MorosoMorasTargetDto { UsuarioId = 1, CasaId = 2 }],
            },
            1,
            "admin@test.com");

        Assert.Null(data);
        Assert.Equal("FNZ_MORA_NO_CONFIGURADA", code);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, status);
    }

    [Fact]
    public async Task AplicarMoras_delegates_to_repository()
    {
        var morosos = new Mock<IMorososRepository>();
        morosos.SetupGet(m => m.TieneColumnaMontoMora).Returns(true);
        morosos.Setup(m => m.AplicarMorasAsync(
                100m,
                It.IsAny<DateTime>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<IReadOnlyList<MorosoMorasTargetRow>>(),
                "admin@test.com",
                1,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync((3, 1));

        var sut = CreateSut(morosos);
        var (data, code, status, _) = await sut.AplicarMorasMorososAsync(
            new AplicarMorasRequest
            {
                MontoMora = 100m,
                Mes = 10,
                Anio = 2026,
                Residentes = [new MorosoMorasTargetDto { UsuarioId = 5 }],
            },
            1,
            "admin@test.com");

        Assert.Equal(StatusCodes.Status200OK, status);
        Assert.Null(code);
        Assert.NotNull(data);
        Assert.Equal(3, data!.Actualizadas);
        Assert.Equal(1, data.Omitidas);
    }

    private sealed class FixedTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _now;

        public FixedTimeProvider(DateTimeOffset now) => _now = now;

        public override DateTimeOffset GetUtcNow() => _now;
    }
}
