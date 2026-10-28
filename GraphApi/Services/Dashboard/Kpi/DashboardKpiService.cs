using System.Security.Claims;
using GraphApi.Infrastructure.Security;
using Microsoft.AspNetCore.Http;
using GraphApi.Models.Dashboard;
using GraphApi.Repositories.Dashboard;
using GraphApi.Services.FNZ;

namespace GraphApi.Services.Dashboard.Kpi;

public sealed class DashboardKpiService : IDashboardKpiService
{
    private static readonly TimeZoneInfo MexicoCity = TimeZoneInfo.FindSystemTimeZoneById(
        OperatingSystem.IsWindows() ? "Central Standard Time (Mexico)" : "America/Mexico_City");

    private readonly IDashboardKpiRepository _repo;
    private readonly TimeProvider _time;

    public DashboardKpiService(IDashboardKpiRepository repo, TimeProvider time)
    {
        _repo = repo;
        _time = time;
    }

    public async Task<(object? Body, string? Code, int Status, string? Detail)> GetResumenAsync(
        ClaimsPrincipal user,
        ResumenPeriodoQuery query,
        CancellationToken ct = default)
    {
        if (!JwtUserContext.TryGetUsuarioId(user, out var usuarioId))
        {
            return (null, null, StatusCodes.Status401Unauthorized, null);
        }

        var esAdmin = JwtUserContext.EsAdministrador(user);
        var esResidente = string.Equals(JwtUserContext.GetPerfil(user), "Residente", StringComparison.OrdinalIgnoreCase);

        if (!esAdmin && !esResidente)
        {
            return (null, "FORBIDDEN", StatusCodes.Status403Forbidden, null);
        }

        var (hoy, inicio, fin) = ResolvePeriodo(query);

        if (esAdmin)
        {
            var condominioId = TryGetCondominioId(user) ?? 1;
            var raw = await _repo.LoadAdminAsync(hoy, inicio, fin, condominioId, ct);
            var dto = new ResumenAdminDto
            {
                TicketsNuevos = raw.TicketsNuevos,
                TicketsEnSeguimiento = raw.TicketsEnSeguimiento,
                MorososMes = raw.MorososMes,
                MontoCobrado = raw.MontoCobrado,
                MontoPendiente = raw.MontoPendiente,
                Ocupacion = CalcOcupacion(raw.TotalCasas, raw.CasasOcupadas),
                TicketsPorCanal = MapCanales(raw.TicketsPorCanal),
            };
            return (dto, null, StatusCodes.Status200OK, null);
        }

        var residente = await _repo.LoadResidenteAsync(usuarioId, hoy, inicio, fin, ct);
        EstadoCuotaMesDto? cuotaDto = null;
        if (residente.CuotaPeriodo is { } c)
        {
            var venc = DateOnly.FromDateTime(c.FechaVencimiento.Date);
            var hoyDate = DateOnly.FromDateTime(hoy.Date);
            var (estado, _) = CuotaEstadoClassifier.Clasificar(c.Pagado, venc, hoyDate);
            cuotaDto = new EstadoCuotaMesDto
            {
                Monto = c.Monto,
                FechaVencimiento = venc,
                Estado = estado,
            };
        }

        var body = new ResumenResidenteDto
        {
            TicketsActivos = residente.TicketsActivos,
            EstadoCuotaMes = cuotaDto,
            NotificacionesNoLeidas = residente.NotificacionesNoLeidas,
            AvisoVencida = residente.TieneCuotaVencida,
        };

        return (body, null, StatusCodes.Status200OK, null);
    }

    private (DateTime Hoy, DateTime Inicio, DateTime Fin) ResolvePeriodo(ResumenPeriodoQuery query)
    {
        var utcNow = _time.GetUtcNow();
        var localNow = TimeZoneInfo.ConvertTimeFromUtc(utcNow.UtcDateTime, MexicoCity);
        var hoy = localNow.Date;

        int mes;
        int anio;
        if (query.Mes is int m && query.Anio is int y)
        {
            mes = m;
            anio = y;
        }
        else
        {
            mes = localNow.Month;
            anio = localNow.Year;
        }

        var inicio = new DateTime(anio, mes, 1);
        var fin = inicio.AddMonths(1);
        return (hoy, inicio, fin);
    }

    private static decimal CalcOcupacion(int total, int ocupadas)
    {
        if (total <= 0)
        {
            return 0m;
        }

        return Math.Round(ocupadas * 100.0m / total, 1);
    }

    private static TicketsPorCanalDto MapCanales(IReadOnlyList<CanalCountRow> rows)
    {
        var web = 0;
        var telegram = 0;
        foreach (var row in rows)
        {
            if (row.Canal.Contains("WEB", StringComparison.OrdinalIgnoreCase))
            {
                web += row.Total;
            }
            else if (row.Canal.Contains("TELEGRAM", StringComparison.OrdinalIgnoreCase))
            {
                telegram += row.Total;
            }
        }

        return new TicketsPorCanalDto { Web = web, Telegram = telegram };
    }

    private static int? TryGetCondominioId(ClaimsPrincipal user)
    {
        var raw = user.FindFirstValue("condominioId");
        return int.TryParse(raw, out var id) ? id : null;
    }
}
