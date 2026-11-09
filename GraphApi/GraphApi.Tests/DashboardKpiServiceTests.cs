using System.Security.Claims;
using GraphApi.Models.Dashboard;
using GraphApi.Repositories.Dashboard;
using GraphApi.Services.Dashboard.Kpi;
using Moq;

namespace GraphApi.Tests;

public class DashboardKpiServiceTests
{
    private static readonly DateTimeOffset MexicoMorningUtc =
        new(2026, 10, 16, 18, 0, 0, TimeSpan.Zero);

    [Fact]
    public async Task Admin_maps_kpis_and_ocupacion()
    {
        var repo = new Mock<IDashboardKpiRepository>();
        repo.Setup(r => r.LoadAdminAsync(
                It.IsAny<DateTime>(),
                It.IsAny<DateTime>(),
                It.IsAny<DateTime>(),
                1,
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AdminKpiRaw
            {
                TicketsNuevos = 4,
                TicketsEnSeguimiento = 2,
                MorososMes = 3,
                MontoCobrado = 1000m,
                MontoPendiente = 500m,
                TotalCasas = 8,
                CasasOcupadas = 7,
                TicketsPorCanal =
                [
                    new CanalCountRow { Canal = "WEB", Total = 5 },
                    new CanalCountRow { Canal = "TELEGRAM", Total = 2 },
                ],
            });

        var sut = new DashboardKpiService(repo.Object, new FixedTimeProvider(MexicoMorningUtc));
        var user = AdminUser(condominioId: 1);

        var (body, _, status, _) = await sut.GetResumenAsync(user, new ResumenPeriodoQuery(), CancellationToken.None);

        Assert.Equal(200, status);
        var dto = Assert.IsType<ResumenAdminDto>(body);
        Assert.Equal("ADMIN", dto.Tipo);
        Assert.Equal(4, dto.TicketsNuevos);
        Assert.Equal(87.5m, dto.Ocupacion);
        Assert.Equal(5, dto.TicketsPorCanal.Web);
        Assert.Equal(2, dto.TicketsPorCanal.Telegram);
    }

    [Fact]
    public async Task Residente_cuota_vencida_y_aviso()
    {
        var repo = new Mock<IDashboardKpiRepository>();
        repo.Setup(r => r.LoadResidenteAsync(
                5,
                It.IsAny<DateTime>(),
                It.IsAny<DateTime>(),
                It.IsAny<DateTime>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResidenteKpiRaw
            {
                TicketsActivos = 2,
                CuotaPeriodo = new CuotaPeriodoRow
                {
                    Monto = 800m,
                    FechaVencimiento = new DateTime(2026, 10, 10),
                    Pagado = false,
                },
                TieneCuotaVencida = true,
                NotificacionesNoLeidas = 3,
            });

        var sut = new DashboardKpiService(repo.Object, new FixedTimeProvider(MexicoMorningUtc));
        var user = ResidenteUser(5);

        var (body, _, status, _) = await sut.GetResumenAsync(user, new ResumenPeriodoQuery(), CancellationToken.None);

        Assert.Equal(200, status);
        var dto = Assert.IsType<ResumenResidenteDto>(body);
        Assert.Equal("Vencida", dto.EstadoCuotaMes!.Estado);
        Assert.True(dto.AvisoVencida);
        Assert.Equal(3, dto.NotificacionesNoLeidas);
    }

    [Fact]
    public async Task Residente_sin_cuota_periodo_null()
    {
        var repo = new Mock<IDashboardKpiRepository>();
        repo.Setup(r => r.LoadResidenteAsync(
                5,
                It.IsAny<DateTime>(),
                It.IsAny<DateTime>(),
                It.IsAny<DateTime>(),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new ResidenteKpiRaw
            {
                TicketsActivos = 0,
                CuotaPeriodo = null,
                TieneCuotaVencida = false,
                NotificacionesNoLeidas = 0,
            });

        var sut = new DashboardKpiService(repo.Object, new FixedTimeProvider(MexicoMorningUtc));
        var (body, _, status, _) = await sut.GetResumenAsync(
            ResidenteUser(5),
            new ResumenPeriodoQuery(),
            CancellationToken.None);

        Assert.Equal(200, status);
        var dto = Assert.IsType<ResumenResidenteDto>(body);
        Assert.Null(dto.EstadoCuotaMes);
    }

    [Fact]
    public async Task Guardia_forbidden()
    {
        var sut = new DashboardKpiService(
            new Mock<IDashboardKpiRepository>().Object,
            new FixedTimeProvider(MexicoMorningUtc));

        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "9"),
            new Claim("perfil", "Guardia"),
        };
        var user = new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));

        var (_, code, status, _) = await sut.GetResumenAsync(user, new ResumenPeriodoQuery(), CancellationToken.None);

        Assert.Equal(403, status);
        Assert.Equal("FORBIDDEN", code);
    }

    private static ClaimsPrincipal AdminUser(int condominioId)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, "1"),
            new Claim("perfil", "Administrador"),
            new Claim("condominioId", condominioId.ToString()),
        };
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
    }

    private static ClaimsPrincipal ResidenteUser(int id)
    {
        var claims = new[]
        {
            new Claim(ClaimTypes.NameIdentifier, id.ToString()),
            new Claim("perfil", "Residente"),
        };
        return new ClaimsPrincipal(new ClaimsIdentity(claims, "test"));
    }

    private sealed class FixedTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _utcNow;

        public FixedTimeProvider(DateTimeOffset utcNow) => _utcNow = utcNow;

        public override DateTimeOffset GetUtcNow() => _utcNow;
    }
}
