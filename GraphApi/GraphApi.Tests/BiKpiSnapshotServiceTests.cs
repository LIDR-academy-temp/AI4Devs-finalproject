using GraphApi.Models.Reports;
using GraphApi.Repositories.Reports;
using GraphApi.Services.Reports;
using Moq;

namespace GraphApi.Tests;

/// <summary>TC-BIRPT-03 / TC-BIRPT-04 — idempotencia y mapeo snapshot.</summary>
public class BiKpiSnapshotServiceTests
{
    [Fact]
    public async Task TC_BIRPT_03_SecondEnsureSameDay_SkipsInsert()
    {
        var repo = new Mock<IBiKpiSnapshotRepository>();
        repo.Setup(r => r.ListCondominioIdsAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync(new[] { 1 });
        repo.SetupSequence(r => r.ExistsAsync(1, It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(false)
            .ReturnsAsync(true);
        repo.Setup(r => r.CalculateAsync(1, It.IsAny<DateOnly>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BiKpiCalculatedRow { TicketsAbiertos = 1, CasasTotales = 10, CasasOcupadas = 8 });
        repo.Setup(r => r.InsertAsync(1, It.IsAny<DateOnly>(), It.IsAny<BiKpiCalculatedRow>(), It.IsAny<CancellationToken>()))
            .Returns(Task.CompletedTask);

        var svc = new BiKpiSnapshotService(repo.Object);
        await svc.EnsureDailySnapshotsAsync(CancellationToken.None);
        await svc.EnsureDailySnapshotsAsync(CancellationToken.None);

        repo.Verify(
            r => r.InsertAsync(1, It.IsAny<DateOnly>(), It.IsAny<BiKpiCalculatedRow>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task TC_BIRPT_04_EnsureSnapshot_PersistsCalculatedRow()
    {
        var fecha = new DateOnly(2026, 1, 15);
        var repo = new Mock<IBiKpiSnapshotRepository>();
        repo.Setup(r => r.ExistsAsync(1, fecha, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        repo.Setup(r => r.CalculateAsync(1, fecha, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new BiKpiCalculatedRow
            {
                TicketsAbiertos = 5,
                TicketsCerrados = 3,
                TiempoMedioResolucionHoras = 12.5m,
                IngresosMXN = 100,
                EgresosMXN = 0,
                ResidentesMorosos = 2,
                CasasTotales = 20,
                CasasOcupadas = 18,
            });
        BiKpiCalculatedRow? captured = null;
        repo.Setup(r => r.InsertAsync(1, fecha, It.IsAny<BiKpiCalculatedRow>(), It.IsAny<CancellationToken>()))
            .Callback<int, DateOnly, BiKpiCalculatedRow, CancellationToken>((_, _, row, _) => captured = row)
            .Returns(Task.CompletedTask);

        var svc = new BiKpiSnapshotService(repo.Object);
        await svc.EnsureSnapshotAsync(1, fecha, CancellationToken.None);

        Assert.NotNull(captured);
        Assert.Equal(5, captured!.TicketsAbiertos);
        Assert.Equal(12.5m, captured.TiempoMedioResolucionHoras);
        Assert.Equal(20, captured.CasasTotales);
    }
}
