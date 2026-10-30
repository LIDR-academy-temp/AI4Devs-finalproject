using GraphApi.Infrastructure;
using GraphApi.Models.FNZ;
using GraphApi.Repositories.FNZ;
using GraphApi.Services.FNZ;
using GraphApi.Services.NTF;
using Moq;

namespace GraphApi.Tests;

public class FinanzasServiceEstadoCuentaTests
{
    private static readonly DateTimeOffset MexicoMorningUtc =
        new(2026, 10, 16, 18, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task ObtenerEstadoCuenta_suma_totales_y_estados()
    {
        var cuotas = new Mock<ICuotaEstadoCuentaRepository>();
        cuotas.Setup(c => c.ListarPorUsuarioAsync(7, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<CuotaEstadoCuentaRow>
            {
                new()
                {
                    CuotaId = 1,
                    Monto = 100m,
                    FechaVencimiento = new DateTime(2026, 10, 20),
                    Pagado = false,
                },
                new()
                {
                    CuotaId = 2,
                    Monto = 200m,
                    FechaVencimiento = new DateTime(2026, 10, 10),
                    Pagado = false,
                },
                new()
                {
                    CuotaId = 3,
                    Monto = 300m,
                    FechaVencimiento = new DateTime(2026, 9, 1),
                    Pagado = true,
                },
            });

        var sut = new FinanzasService(
            cuotas.Object,
            new Mock<ICuotaGeneracionRepository>().Object,
            new Mock<ITiposCuentaFnzRepository>().Object,
            new Mock<ITiposMovimientoFnzRepository>().Object,
            new Mock<ITransaccionesFnzRepository>().Object,
            new Mock<ICuotaPagoRepository>().Object,
            new Mock<IMorososRepository>().Object,
            new Mock<INotificacionService>().Object,
            new Mock<IUnitOfWork>().Object,
            new FixedTimeProvider(MexicoMorningUtc));

        var result = await sut.ObtenerEstadoCuentaAsync(7);

        Assert.Equal(100m, result.TotalPendiente);
        Assert.Equal(200m, result.TotalVencido);
        Assert.Equal(3, result.Cuotas.Count);
        Assert.Equal("Pendiente", result.Cuotas[0].Estado);
        Assert.Equal("Vencida", result.Cuotas[1].Estado);
        Assert.True(result.Cuotas[1].EsVencida);
        Assert.Equal("Pagada", result.Cuotas[2].Estado);
    }

    private sealed class FixedTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _utcNow;

        public FixedTimeProvider(DateTimeOffset utcNow) => _utcNow = utcNow;

        public override DateTimeOffset GetUtcNow() => _utcNow;
    }
}
