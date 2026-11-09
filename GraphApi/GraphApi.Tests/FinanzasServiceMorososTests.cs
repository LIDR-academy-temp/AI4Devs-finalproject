using GraphApi.Infrastructure;
using GraphApi.Models.FNZ;
using GraphApi.Repositories.FNZ;
using GraphApi.Services.FNZ;
using GraphApi.Services.NTF;
using Moq;

namespace GraphApi.Tests;

public class FinanzasServiceMorososTests
{
    private static readonly DateTimeOffset MexicoMorningUtc =
        new(2026, 10, 16, 18, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task ObtenerMorosos_maps_rows_and_passes_period_filter()
    {
        var morosos = new Mock<IMorososRepository>();
        morosos.Setup(m => m.ListarMorososAsync(
                It.IsAny<DateTime>(),
                It.IsAny<DateTime?>(),
                It.IsAny<DateTime?>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<MorosoRow>
            {
                new()
                {
                    UsuarioId = 10,
                    Nombre = "Juan",
                    Casa = "12",
                    CuotasVencidas = 2,
                    TotalAdeudado = 2400m,
                },
            });

        var sut = new FinanzasService(
            new Mock<ICuotaEstadoCuentaRepository>().Object,
            new Mock<ICuotaGeneracionRepository>().Object,
            new Mock<ITiposCuentaFnzRepository>().Object,
            new Mock<ITiposMovimientoFnzRepository>().Object,
            new Mock<ITransaccionesFnzRepository>().Object,
            new Mock<ICuotaPagoRepository>().Object,
            morosos.Object,
            new Mock<INotificacionService>().Object,
            new Mock<IUnitOfWork>().Object,
            new FixedTimeProvider(MexicoMorningUtc));

        var result = await sut.ObtenerMorososAsync(9, 2026);

        Assert.Single(result);
        Assert.Equal(10, result[0].UsuarioId);
        Assert.Equal(2400m, result[0].TotalAdeudado);

        morosos.Verify(m => m.ListarMorososAsync(
            new DateTime(2026, 10, 16),
            new DateTime(2026, 9, 1),
            new DateTime(2026, 10, 1),
            It.IsAny<CancellationToken>()), Times.Once);
    }

    private sealed class FixedTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _utcNow;

        public FixedTimeProvider(DateTimeOffset utcNow) => _utcNow = utcNow;

        public override DateTimeOffset GetUtcNow() => _utcNow;
    }
}
