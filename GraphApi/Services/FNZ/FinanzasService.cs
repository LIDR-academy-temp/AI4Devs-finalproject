using GraphApi.Infrastructure;
using GraphApi.Models.FNZ;
using GraphApi.Models.NTF;
using GraphApi.Repositories.FNZ;
using GraphApi.Services.NTF;

namespace GraphApi.Services.FNZ;

public sealed class FinanzasService : IFinanzasService
{
    private static readonly TimeZoneInfo MexicoCity = TimeZoneInfo.FindSystemTimeZoneById(
        OperatingSystem.IsWindows() ? "Central Standard Time (Mexico)" : "America/Mexico_City");

    private readonly ICuotaEstadoCuentaRepository _cuotas;
    private readonly ICuotaGeneracionRepository _generacion;
    private readonly ICuotaPagoRepository _pago;
    private readonly IMorososRepository _morosos;
    private readonly INotificacionService _notificaciones;
    private readonly IUnitOfWork _uow;
    private readonly TimeProvider _time;

    public FinanzasService(
        ICuotaEstadoCuentaRepository cuotas,
        ICuotaGeneracionRepository generacion,
        ICuotaPagoRepository pago,
        IMorososRepository morosos,
        INotificacionService notificaciones,
        IUnitOfWork uow,
        TimeProvider time)
    {
        _cuotas = cuotas;
        _generacion = generacion;
        _pago = pago;
        _morosos = morosos;
        _notificaciones = notificaciones;
        _uow = uow;
        _time = time;
    }

    public async Task<EstadoCuentaDto> ObtenerEstadoCuentaAsync(int usuarioId, CancellationToken ct = default)
    {
        var hoy = HoyMexico();
        var rows = await _cuotas.ListarPorUsuarioAsync(usuarioId, ct);

        var cuotas = new List<CuotaEstadoDto>();
        decimal totalPendiente = 0;
        decimal totalVencido = 0;

        foreach (var row in rows)
        {
            var venc = DateOnly.FromDateTime(row.FechaVencimiento.Date);
            var (estado, esVencida) = CuotaEstadoClassifier.Clasificar(row.Pagado, venc, hoy);

            if (estado == "Pendiente")
            {
                totalPendiente += row.Monto;
            }
            else if (estado == "Vencida")
            {
                totalVencido += row.Monto;
            }

            cuotas.Add(new CuotaEstadoDto
            {
                CuotaId = row.CuotaId,
                CasaId = row.CasaId,
                Direccion = row.Direccion,
                Numero = row.Numero,
                CuentaId = row.CuentaId,
                Cuenta = row.Cuenta,
                Monto = row.Monto,
                MontoPagado = row.MontoPagado,
                PeriodoInicio = row.PeriodoInicio,
                PeriodoFin = row.PeriodoFin,
                FechaVencimiento = row.FechaVencimiento,
                FechaPago = row.FechaPago,
                MetodoPago = row.MetodoPago,
                ReferenciaPago = row.ReferenciaPago,
                Estado = estado,
                EsVencida = esVencida,
            });
        }

        return new EstadoCuentaDto
        {
            Cuotas = cuotas,
            TotalPendiente = totalPendiente,
            TotalVencido = totalVencido,
        };
    }

    public async Task<(GenerarCuotasResultDto? Data, string? Code, int Status, string? Detail)> GenerarCuotasPeriodoAsync(
        GenerarCuotasRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var periodoInicio = new DateTime(request.Anio, request.Mes, 1, 0, 0, 0, DateTimeKind.Unspecified);
        var periodoFin = periodoInicio.AddMonths(1).AddDays(-1);

        if (request.FechaVencimiento.Date < periodoInicio.Date)
        {
            return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest,
                "La fecha de vencimiento no puede ser anterior al inicio del período.");
        }

        if (request.CuentaId.HasValue && !await _generacion.CuentaExisteAsync(request.CuentaId.Value, ct))
        {
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Cuenta no encontrada");
        }

        var elegibles = await _generacion.ListarCasasElegiblesAsync(ct);
        var totalCasas = await _generacion.ContarCasasActivasAsync(ct);
        var sinOcupante = Math.Max(0, totalCasas - elegibles.Count);

        var creadas = 0;
        var omitidas = sinOcupante;

        var tx = _uow.BeginTransaction();
        try
        {
            foreach (var casa in elegibles)
            {
                if (await _generacion.ExisteCuotaPeriodoAsync(casa.CasaId, periodoInicio, tx))
                {
                    omitidas++;
                    continue;
                }

                var ok = await _generacion.InsertarCuotaAsync(
                    casa.CasaId,
                    casa.UsuarioId,
                    request.CuentaId,
                    request.Monto,
                    periodoInicio,
                    periodoFin,
                    request.FechaVencimiento,
                    adminCorreo,
                    adminId,
                    tx);

                if (ok)
                {
                    creadas++;
                }
                else
                {
                    omitidas++;
                }
            }

            _uow.Commit();
        }
        catch
        {
            _uow.Rollback();
            throw;
        }

        return (new GenerarCuotasResultDto { Creadas = creadas, Omitidas = omitidas },
            null, StatusCodes.Status200OK, null);
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> RegistrarPagoAsync(
        int cuotaId,
        RegistrarPagoRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var hoy = HoyMexico();
        var fechaPago = DateOnly.FromDateTime(request.FechaPago.Date);
        if (fechaPago > hoy)
        {
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest,
                "La fecha de pago no puede ser futura");
        }

        var tx = _uow.BeginTransaction();
        try
        {
            var cuota = await _pago.ObtenerConBloqueoAsync(cuotaId, tx);
            if (cuota is null)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Cuota no encontrada");
            }

            if (cuota.Pagado)
            {
                _uow.Rollback();
                return (false, "CONFLICT", StatusCodes.Status409Conflict, "Cuota ya registrada como pagada");
            }

            if (cuota.Monto != request.MontoPagado)
            {
                _uow.Rollback();
                return (false, "VALIDATION_ERROR", StatusCodes.Status422UnprocessableEntity,
                    "El monto debe coincidir con la cuota (pagos parciales fuera de alcance)");
            }

            var cuentaId = cuota.CuentaId;
            if (_pago.TieneColumnaCuentaId)
            {
                if (cuentaId is null)
                {
                    _uow.Rollback();
                    return (false, "VALIDATION_ERROR", StatusCodes.Status422UnprocessableEntity,
                        "La cuota no tiene cuenta contable asignada");
                }
            }
            else
            {
                cuentaId = await _pago.ObtenerPrimeraCuentaIdAsync(ct);
                if (cuentaId is null)
                {
                    _uow.Rollback();
                    return (false, "VALIDATION_ERROR", StatusCodes.Status422UnprocessableEntity,
                        "No hay cuentas contables configuradas");
                }
            }

            var filas = await _pago.MarcarPagadaAsync(
                cuotaId,
                request.FechaPago,
                request.MontoPagado,
                request.MetodoPago,
                request.ReferenciaPago.Trim(),
                adminCorreo,
                adminId,
                tx);

            if (filas != 1)
            {
                _uow.Rollback();
                return (false, "CONFLICT", StatusCodes.Status409Conflict, "Cuota ya registrada como pagada");
            }

            var transFilas = await _pago.InsertarTransaccionPagoAsync(
                cuentaId.Value,
                cuota.UsuarioId,
                request.MontoPagado,
                $"Pago cuota #{cuotaId}",
                adminCorreo,
                adminId,
                tx);

            if (transFilas != 1)
            {
                _uow.Rollback();
                return (false, "VALIDATION_ERROR", StatusCodes.Status422UnprocessableEntity,
                    "Tipo de movimiento 'Pago de cuota' no configurado");
            }

            var periodo = cuota.PeriodoInicio.ToString("MMMM yyyy", new System.Globalization.CultureInfo("es-MX"));
            var autor = new NotificacionAutor(adminId, adminCorreo);
            await _notificaciones.NotificarUsuarioAsync(
                tx,
                cuota.UsuarioId,
                "PAGO_REGISTRADO",
                "Pago registrado",
                $"Pago de {request.MontoPagado:N2} MXN registrado. Período: {periodo}",
                autor);

            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<IReadOnlyList<MorosoDto>> ObtenerMorososAsync(
        int? mes,
        int? anio,
        CancellationToken ct = default)
    {
        var hoy = HoyMexico();
        var hoyDt = hoy.ToDateTime(TimeOnly.MinValue);

        DateTime? desde = null;
        DateTime? hasta = null;
        if (mes is not null && anio is not null)
        {
            desde = new DateTime(anio.Value, mes.Value, 1);
            hasta = desde.Value.AddMonths(1);
        }

        var rows = await _morosos.ListarMorososAsync(hoyDt, desde, hasta, ct);
        return rows.Select(r => new MorosoDto
        {
            UsuarioId = r.UsuarioId,
            Nombre = r.Nombre,
            Casa = r.Casa,
            CuotasVencidas = r.CuotasVencidas,
            TotalAdeudado = r.TotalAdeudado,
        }).ToList();
    }

    internal DateOnly HoyMexico()
    {
        var utc = _time.GetUtcNow().UtcDateTime;
        var local = TimeZoneInfo.ConvertTimeFromUtc(utc, MexicoCity);
        return DateOnly.FromDateTime(local);
    }
}
