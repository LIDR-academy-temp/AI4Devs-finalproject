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
    private readonly ITiposCuentaFnzRepository _tiposCuenta;
    private readonly ITiposMovimientoFnzRepository _tiposMovimiento;
    private readonly ITransaccionesFnzRepository _transacciones;
    private readonly ICuotaPagoRepository _pago;
    private readonly IMorososRepository _morosos;
    private readonly INotificacionService _notificaciones;
    private readonly IUnitOfWork _uow;
    private readonly TimeProvider _time;

    public FinanzasService(
        ICuotaEstadoCuentaRepository cuotas,
        ICuotaGeneracionRepository generacion,
        ITiposCuentaFnzRepository tiposCuenta,
        ITiposMovimientoFnzRepository tiposMovimiento,
        ITransaccionesFnzRepository transacciones,
        ICuotaPagoRepository pago,
        IMorososRepository morosos,
        INotificacionService notificaciones,
        IUnitOfWork uow,
        TimeProvider time)
    {
        _cuotas = cuotas;
        _generacion = generacion;
        _tiposCuenta = tiposCuenta;
        _tiposMovimiento = tiposMovimiento;
        _transacciones = transacciones;
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
            var totalCuota = row.Monto + row.MontoMora;

            if (estado == "Pendiente")
            {
                totalPendiente += totalCuota;
            }
            else if (estado == "Vencida")
            {
                totalVencido += totalCuota;
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
                MontoMora = row.MontoMora,
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
            return (null, "FNZ_CUENTA_NO_ENCONTRADA", StatusCodes.Status422UnprocessableEntity,
                "La cuenta indicada no existe. Elija una del listado o deje el campo vacío.");
        }

        var cuentaIdGeneracion = request.CuentaId;
        if (!cuentaIdGeneracion.HasValue)
        {
            var cuentasActivas = await _generacion.ListarCuentasActivasAsync(ct);
            if (cuentasActivas.Count > 0)
                cuentaIdGeneracion = cuentasActivas[0].CuentaId;
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
                    cuentaIdGeneracion,
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

    public async Task<IReadOnlyList<CuentaFnzCatalogoDto>> ListarCuentasCatalogoAsync(CancellationToken ct = default)
    {
        var rows = await _generacion.ListarCuentasActivasAsync(ct);
        return rows.Select(r => new CuentaFnzCatalogoDto { CuentaId = r.CuentaId, Nombre = r.Nombre }).ToList();
    }

    public async Task<IReadOnlyList<CuentaFnzAdminDto>> ListarCuentasAdminAsync(CancellationToken ct = default)
    {
        var rows = await _generacion.ListarCuentasAdminAsync(ct);
        return rows.Select(MapCuentaAdmin).ToList();
    }

    public async Task<(CuentaFnzAdminDto? Data, string? Code, int Status, string? Detail)> CrearCuentaAdminAsync(
        CuentaFnzUpsertRequest request, string correo, int userId, CancellationToken ct = default)
    {
        var (ok, code, status, detail) = ValidarCuentaUpsert(request);
        if (!ok) return (null, code, status, detail);
        (ok, code, status, detail) = await ValidarTipoCuentaContraCatalogoAsync(request.Tipo, ct);
        if (!ok) return (null, code, status, detail);

        var newId = await _generacion.InsertarCuentaAsync(
            request.Nombre.Trim(),
            request.Tipo.Trim(),
            request.Saldo,
            request.ResponsableUsuarioId,
            correo,
            userId,
            ct);
        var row = await _generacion.ObtenerCuentaAsync(newId, ct);
        if (row is null)
            return (null, "FNZ_CUENTA_ERROR", StatusCodes.Status500InternalServerError, "No se pudo leer la cuenta creada.");
        return (MapCuentaAdmin(row), null, StatusCodes.Status201Created, null);
    }

    public async Task<(CuentaFnzAdminDto? Data, string? Code, int Status, string? Detail)> ActualizarCuentaAdminAsync(
        int cuentaId, CuentaFnzUpsertRequest request, string correo, int userId, CancellationToken ct = default)
    {
        if (cuentaId <= 0)
            return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Identificador de cuenta inválido.");
        var (ok, code, status, detail) = ValidarCuentaUpsert(request);
        if (!ok) return (null, code, status, detail);
        (ok, code, status, detail) = await ValidarTipoCuentaContraCatalogoAsync(request.Tipo, ct);
        if (!ok) return (null, code, status, detail);

        var updated = await _generacion.ActualizarCuentaAsync(
            cuentaId,
            request.Nombre.Trim(),
            request.Tipo.Trim(),
            request.Saldo,
            request.ResponsableUsuarioId,
            correo,
            userId,
            ct);
        if (!updated)
            return (null, "FNZ_CUENTA_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Cuenta no encontrada.");
        var row = await _generacion.ObtenerCuentaAsync(cuentaId, ct);
        return (row is null ? null : MapCuentaAdmin(row), null, StatusCodes.Status200OK, null);
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarCuentaAdminAsync(
        int cuentaId, string correo, int userId, CancellationToken ct = default)
    {
        if (cuentaId <= 0)
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Identificador de cuenta inválido.");
        var ok = await _generacion.SoftDeleteCuentaAsync(cuentaId, correo, userId, ct);
        if (!ok)
            return (false, "FNZ_CUENTA_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Cuenta no encontrada.");
        return (true, null, StatusCodes.Status204NoContent, null);
    }

    public async Task<IReadOnlyList<TipoCuentaFnzDto>> ListarTiposCuentaAdminAsync(CancellationToken ct = default)
    {
        var rows = await _tiposCuenta.ListarAsync(ct);
        return rows.Select(MapTipoCuenta).ToList();
    }

    public async Task<(TipoCuentaFnzDto? Data, string? Code, int Status, string? Detail)> CrearTipoCuentaAdminAsync(
        TipoCuentaFnzUpsertRequest request, string correo, int userId, CancellationToken ct = default)
    {
        var (ok, code, status, detail) = ValidarTipoCuentaUpsert(request);
        if (!ok) return (null, code, status, detail);
        if (!await _tiposCuenta.TablaDisponibleAsync(ct))
        {
            return (null, "FNZ_TIPOS_CUENTA_CATALOGO_PENDIENTE", StatusCodes.Status503ServiceUnavailable,
                "Ejecute el script SQL 20261029_fnz_tipos_cuenta_catalog.sql en la base de datos.");
        }

        var nombre = request.Nombre.Trim();
        if (await _tiposCuenta.ExisteNombreAsync(nombre, null, ct))
        {
            return (null, "CONFLICT", StatusCodes.Status409Conflict, "Ya existe un tipo con ese nombre.");
        }

        var newId = await _tiposCuenta.InsertarAsync(nombre, request.Descripcion?.Trim(), correo, userId, ct);
        var row = await _tiposCuenta.ObtenerAsync(newId, ct);
        if (row is null)
        {
            return (null, "FNZ_TIPO_CUENTA_ERROR", StatusCodes.Status500InternalServerError,
                "No se pudo leer el tipo creado.");
        }

        return (MapTipoCuenta(row), null, StatusCodes.Status201Created, null);
    }

    public async Task<(TipoCuentaFnzDto? Data, string? Code, int Status, string? Detail)> ActualizarTipoCuentaAdminAsync(
        int tipoCuentaId, TipoCuentaFnzUpsertRequest request, string correo, int userId, CancellationToken ct = default)
    {
        if (tipoCuentaId <= 0)
        {
            return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Identificador de tipo inválido.");
        }

        var (ok, code, status, detail) = ValidarTipoCuentaUpsert(request);
        if (!ok) return (null, code, status, detail);
        if (!await _tiposCuenta.TablaDisponibleAsync(ct))
        {
            return (null, "FNZ_TIPOS_CUENTA_CATALOGO_PENDIENTE", StatusCodes.Status503ServiceUnavailable,
                "Ejecute el script SQL 20261029_fnz_tipos_cuenta_catalog.sql en la base de datos.");
        }

        var nombre = request.Nombre.Trim();
        if (await _tiposCuenta.ExisteNombreAsync(nombre, tipoCuentaId, ct))
        {
            return (null, "CONFLICT", StatusCodes.Status409Conflict, "Ya existe un tipo con ese nombre.");
        }

        var updated = await _tiposCuenta.ActualizarAsync(
            tipoCuentaId, nombre, request.Descripcion?.Trim(), correo, userId, ct);
        if (!updated)
        {
            return (null, "FNZ_TIPO_CUENTA_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo no encontrado.");
        }

        var row = await _tiposCuenta.ObtenerAsync(tipoCuentaId, ct);
        return row is null
            ? (null, "FNZ_TIPO_CUENTA_ERROR", StatusCodes.Status500InternalServerError, "No se pudo leer el tipo.")
            : (MapTipoCuenta(row), null, StatusCodes.Status200OK, null);
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarTipoCuentaAdminAsync(
        int tipoCuentaId, string correo, int userId, CancellationToken ct = default)
    {
        if (tipoCuentaId <= 0)
        {
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Identificador de tipo inválido.");
        }

        if (!await _tiposCuenta.TablaDisponibleAsync(ct))
        {
            return (false, "FNZ_TIPOS_CUENTA_CATALOGO_PENDIENTE", StatusCodes.Status503ServiceUnavailable,
                "Ejecute el script SQL 20261029_fnz_tipos_cuenta_catalog.sql en la base de datos.");
        }

        var row = await _tiposCuenta.ObtenerAsync(tipoCuentaId, ct);
        if (row is null)
        {
            return (false, "FNZ_TIPO_CUENTA_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo no encontrado.");
        }

        var enUso = await _generacion.ContarCuentasPorTipoAsync(row.Nombre, ct);
        if (enUso > 0)
        {
            return (false, "CONFLICT", StatusCodes.Status409Conflict,
                "Hay cuentas contables que usan este tipo; cámbielas antes de eliminar.");
        }

        var ok = await _tiposCuenta.SoftDeleteAsync(tipoCuentaId, correo, userId, ct);
        if (!ok)
        {
            return (false, "FNZ_TIPO_CUENTA_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo no encontrado.");
        }

        return (true, null, StatusCodes.Status204NoContent, null);
    }

    public async Task<IReadOnlyList<TipoMovimientoFnzDto>> ListarTiposMovimientoAdminAsync(CancellationToken ct = default)
    {
        var rows = await _tiposMovimiento.ListarAsync(ct);
        return rows.Select(MapTipoMovimiento).ToList();
    }

    public async Task<(TipoMovimientoFnzDto? Data, string? Code, int Status, string? Detail)> CrearTipoMovimientoAdminAsync(
        TipoMovimientoFnzUpsertRequest request, string correo, int userId, CancellationToken ct = default)
    {
        var (ok, code, status, detail) = ValidarTipoMovimientoUpsert(request);
        if (!ok) return (null, code, status, detail);
        if (!await _tiposMovimiento.TablaDisponibleAsync(ct))
        {
            return (null, "FNZ_TIPOS_MOVIMIENTO_PENDIENTE", StatusCodes.Status503ServiceUnavailable,
                "Ejecute DB-002 o SQL/20261029_fnz_pago_cuota_catalog.sql en la base de datos.");
        }

        var nombre = request.TipoMovimiento.Trim();
        if (await _tiposMovimiento.ExisteNombreAsync(nombre, null, ct))
        {
            return (null, "CONFLICT", StatusCodes.Status409Conflict, "Ya existe un tipo con ese nombre.");
        }

        var newId = await _tiposMovimiento.InsertarAsync(
            nombre, request.BCargo, request.BAbono, correo, userId, ct);
        var row = await _tiposMovimiento.ObtenerAsync(newId, ct);
        if (row is null)
        {
            return (null, "FNZ_TIPO_MOVIMIENTO_ERROR", StatusCodes.Status500InternalServerError,
                "No se pudo leer el tipo creado.");
        }

        return (MapTipoMovimiento(row), null, StatusCodes.Status201Created, null);
    }

    public async Task<(TipoMovimientoFnzDto? Data, string? Code, int Status, string? Detail)> ActualizarTipoMovimientoAdminAsync(
        int tipoMovimientoId, TipoMovimientoFnzUpsertRequest request, string correo, int userId, CancellationToken ct = default)
    {
        if (tipoMovimientoId <= 0)
        {
            return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Identificador de tipo inválido.");
        }

        var (ok, code, status, detail) = ValidarTipoMovimientoUpsert(request);
        if (!ok) return (null, code, status, detail);

        var nombre = request.TipoMovimiento.Trim();
        if (await _tiposMovimiento.ExisteNombreAsync(nombre, tipoMovimientoId, ct))
        {
            return (null, "CONFLICT", StatusCodes.Status409Conflict, "Ya existe un tipo con ese nombre.");
        }

        var updated = await _tiposMovimiento.ActualizarAsync(
            tipoMovimientoId, nombre, request.BCargo, request.BAbono, correo, userId, ct);
        if (!updated)
        {
            return (null, "FNZ_TIPO_MOVIMIENTO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo no encontrado.");
        }

        var row = await _tiposMovimiento.ObtenerAsync(tipoMovimientoId, ct);
        return row is null
            ? (null, "FNZ_TIPO_MOVIMIENTO_ERROR", StatusCodes.Status500InternalServerError, "No se pudo leer el tipo.")
            : (MapTipoMovimiento(row), null, StatusCodes.Status200OK, null);
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarTipoMovimientoAdminAsync(
        int tipoMovimientoId, string correo, int userId, CancellationToken ct = default)
    {
        if (tipoMovimientoId <= 0)
        {
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Identificador de tipo inválido.");
        }

        var row = await _tiposMovimiento.ObtenerAsync(tipoMovimientoId, ct);
        if (row is null)
        {
            return (false, "FNZ_TIPO_MOVIMIENTO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo no encontrado.");
        }

        var enUso = await _tiposMovimiento.ContarTransaccionesAsync(tipoMovimientoId, ct);
        if (enUso > 0)
        {
            return (false, "CONFLICT", StatusCodes.Status409Conflict,
                "Hay transacciones que usan este tipo; no se puede eliminar.");
        }

        var ok = await _tiposMovimiento.SoftDeleteAsync(tipoMovimientoId, correo, userId, ct);
        if (!ok)
        {
            return (false, "FNZ_TIPO_MOVIMIENTO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo no encontrado.");
        }

        return (true, null, StatusCodes.Status204NoContent, null);
    }

    public async Task<IReadOnlyList<PeriodoCuotasGeneradoDto>> ListarPeriodosGeneradosAdminAsync(
        CancellationToken ct = default)
    {
        var rows = await _transacciones.ListarPeriodosGeneradosAsync(ct);
        return rows.Select(r => new PeriodoCuotasGeneradoDto
        {
            PeriodoInicio = r.PeriodoInicio,
            Mes = r.PeriodoInicio.Month,
            Anio = r.PeriodoInicio.Year,
            CuotasGeneradas = r.CuotasGeneradas,
            Casas = r.Casas,
            MontoUnitario = r.MontoUnitario,
            FechaVencimiento = r.FechaVencimiento,
            GeneradoEn = r.GeneradoEn,
            CuentaNombre = r.CuentaNombre,
        }).ToList();
    }

    public async Task<IReadOnlyList<MovimientoFnzDto>> ListarMovimientosAdminAsync(CancellationToken ct = default)
    {
        var rows = await _transacciones.ListarMovimientosAdminAsync(100, ct);
        return rows.Select(MapMovimiento).ToList();
    }

    public async Task<(MovimientoFnzDto? Data, string? Code, int Status, string? Detail)> RegistrarMovimientoAdminAsync(
        RegistrarMovimientoFnzRequest request, int adminId, string adminCorreo, CancellationToken ct = default)
    {
        if (request.CuentaId <= 0)
        {
            return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Cuenta inválida.");
        }

        if (string.IsNullOrWhiteSpace(request.TipoMovimiento))
        {
            return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Tipo de movimiento requerido.");
        }

        if (request.Monto <= 0)
        {
            return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "El monto debe ser mayor a cero.");
        }

        if (string.IsNullOrWhiteSpace(request.Motivo))
        {
            return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "El motivo es requerido.");
        }

        if (!await _generacion.CuentaExisteAsync(request.CuentaId, ct))
        {
            return (null, "FNZ_CUENTA_NO_ENCONTRADA", StatusCodes.Status422UnprocessableEntity, "Cuenta no encontrada.");
        }

        var tipo = await _tiposMovimiento.ObtenerPorNombreAsync(request.TipoMovimiento.Trim(), ct);
        if (tipo is null)
        {
            return (null, "FNZ_TIPO_MOVIMIENTO_INVALIDO", StatusCodes.Status422UnprocessableEntity,
                "Tipo de movimiento no configurado. Créalo en «Tipos de movimiento».");
        }

        decimal? cargo = null;
        decimal? abono = null;
        decimal deltaSaldo;
        if (tipo.BCargo && !tipo.BAbono)
        {
            cargo = request.Monto;
            deltaSaldo = -request.Monto;
        }
        else if (tipo.BAbono && !tipo.BCargo)
        {
            abono = request.Monto;
            deltaSaldo = request.Monto;
        }
        else if (tipo.BCargo && tipo.BAbono)
        {
            return (null, "VALIDATION_ERROR", StatusCodes.Status422UnprocessableEntity,
                "El tipo no puede ser cargo y abono a la vez; ajuste el catálogo.");
        }
        else
        {
            return (null, "VALIDATION_ERROR", StatusCodes.Status422UnprocessableEntity,
                "El tipo debe ser cargo (egreso) o abono (ingreso).");
        }

        var tx = _uow.BeginTransaction();
        try
        {
            var newId = await _transacciones.InsertarMovimientoAsync(
                request.CuentaId,
                adminId,
                tipo.TipoMovimientoId,
                cargo,
                abono,
                request.Motivo.Trim(),
                adminCorreo,
                adminId,
                tx);

            if (!await _transacciones.AjustarSaldoCuentaAsync(request.CuentaId, deltaSaldo, tx))
            {
                _uow.Rollback();
                return (null, "FNZ_CUENTA_NO_ENCONTRADA", StatusCodes.Status422UnprocessableEntity, "Cuenta no encontrada.");
            }

            _uow.Commit();

            var rows = await _transacciones.ListarMovimientosAdminAsync(1, ct);
            var created = rows.FirstOrDefault(r => r.TransaccionId == newId);
            if (created is null)
            {
                return (new MovimientoFnzDto
                {
                    TransaccionId = newId,
                    CuentaId = request.CuentaId,
                    TipoMovimiento = tipo.TipoMovimiento,
                    Cargo = cargo,
                    Abono = abono,
                    Motivo = request.Motivo.Trim(),
                    FechaCreacion = DateTime.UtcNow,
                }, null, StatusCodes.Status201Created, null);
            }

            return (MapMovimiento(created), null, StatusCodes.Status201Created, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    private static MovimientoFnzDto MapMovimiento(MovimientoFnzRow r) => new()
    {
        TransaccionId = r.TransaccionId,
        CuentaId = r.CuentaId,
        CuentaNombre = r.CuentaNombre,
        TipoMovimiento = r.TipoMovimiento,
        Cargo = r.Cargo,
        Abono = r.Abono,
        Motivo = r.Motivo,
        FechaCreacion = r.FechaCreacion,
    };

    private static (bool Ok, string? Code, int Status, string? Detail) ValidarCuentaUpsert(CuentaFnzUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "El nombre de la cuenta es requerido.");
        if (string.IsNullOrWhiteSpace(request.Tipo))
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "El tipo de cuenta es requerido.");
        if (request.Nombre.Length > 150)
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Nombre demasiado largo.");
        if (request.Tipo.Length > 50)
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Tipo demasiado largo.");
        return (true, null, 0, null);
    }

    private static (bool Ok, string? Code, int Status, string? Detail) ValidarTipoCuentaUpsert(
        TipoCuentaFnzUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.Nombre))
        {
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "El nombre del tipo es requerido.");
        }

        if (request.Nombre.Trim().Length > 50)
        {
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Nombre demasiado largo.");
        }

        if (request.Descripcion is { Length: > 200 })
        {
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Descripción demasiado larga.");
        }

        return (true, null, 0, null);
    }

    private async Task<(bool Ok, string? Code, int Status, string? Detail)> ValidarTipoCuentaContraCatalogoAsync(
        string tipo, CancellationToken ct)
    {
        if (!await _tiposCuenta.TablaDisponibleAsync(ct))
        {
            return (true, null, 0, null);
        }

        var tipos = await _tiposCuenta.ListarAsync(ct);
        var ok = tipos.Any(t => string.Equals(t.Nombre, tipo.Trim(), StringComparison.OrdinalIgnoreCase));
        if (!ok)
        {
            return (false, "FNZ_TIPO_CUENTA_INVALIDO", StatusCodes.Status422UnprocessableEntity,
                "El tipo debe existir en el catálogo «Tipos de cuenta».");
        }

        return (true, null, 0, null);
    }

    private static (bool Ok, string? Code, int Status, string? Detail) ValidarTipoMovimientoUpsert(
        TipoMovimientoFnzUpsertRequest request)
    {
        if (string.IsNullOrWhiteSpace(request.TipoMovimiento))
        {
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "El nombre del tipo es requerido.");
        }

        if (request.TipoMovimiento.Trim().Length > 100)
        {
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Nombre demasiado largo.");
        }

        if (!request.BCargo && !request.BAbono)
        {
            return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest,
                "Indique si el tipo es cargo, abono o ambos.");
        }

        return (true, null, 0, null);
    }

    private static TipoMovimientoFnzDto MapTipoMovimiento(TipoMovimientoFnzRow r) => new()
    {
        TipoMovimientoId = r.TipoMovimientoId,
        TipoMovimiento = r.TipoMovimiento,
        BCargo = r.BCargo,
        BAbono = r.BAbono,
    };

    private static TipoCuentaFnzDto MapTipoCuenta(TipoCuentaFnzRow r) => new()
    {
        TipoCuentaId = r.TipoCuentaId,
        Nombre = r.Nombre,
        Descripcion = r.Descripcion,
    };

    private static CuentaFnzAdminDto MapCuentaAdmin(CuentaFnzAdminRow r) => new()
    {
        CuentaId = r.CuentaId,
        Nombre = r.Nombre,
        Tipo = r.Tipo,
        Saldo = r.Saldo,
        ResponsableUsuarioId = r.ResponsableUsuarioId,
    };

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

            var montoEsperado = cuota.Monto + cuota.MontoMora;
            if (montoEsperado != request.MontoPagado)
            {
                _uow.Rollback();
                return (false, "VALIDATION_ERROR", StatusCodes.Status422UnprocessableEntity,
                    "El monto debe coincidir con la cuota incluyendo mora (pagos parciales fuera de alcance)");
            }

            var cuentaId = cuota.CuentaId;
            if (_pago.TieneColumnaCuentaId)
            {
                if (cuentaId is null)
                {
                    cuentaId = await _pago.ObtenerPrimeraCuentaIdAsync(ct, tx);
                    if (cuentaId is null)
                    {
                        _uow.Rollback();
                        return (false, "VALIDATION_ERROR", StatusCodes.Status422UnprocessableEntity,
                            "No hay cuentas contables configuradas");
                    }

                    var asignadas = await _pago.AsignarCuentaCuotaAsync(cuotaId, cuentaId.Value, tx);
                    if (asignadas != 1)
                    {
                        _uow.Rollback();
                        return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Cuota no encontrada");
                    }
                }
            }
            else
            {
                cuentaId = await _pago.ObtenerPrimeraCuentaIdAsync(ct, tx);
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

            if (!await _transacciones.AjustarSaldoCuentaAsync(cuentaId.Value, request.MontoPagado, tx))
            {
                _uow.Rollback();
                return (false, "FNZ_CUENTA_NO_ENCONTRADA", StatusCodes.Status422UnprocessableEntity, "Cuenta no encontrada.");
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
            CasaId = r.CasaId,
            CuotasVencidas = r.CuotasVencidas,
            MorasAplicadas = r.MorasAplicadas,
            TotalMora = r.TotalMora,
            TotalAdeudado = r.TotalAdeudado,
        }).ToList();
    }

    public async Task<(MorasBatchResultDto? Data, string? Code, int Status, string? Detail)> AplicarMorasMorososAsync(
        AplicarMorasRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        if (!_morosos.TieneColumnaMontoMora)
        {
            return (null, "FNZ_MORA_NO_CONFIGURADA", StatusCodes.Status422UnprocessableEntity,
                "Ejecute el script SQL de MontoMora en fnz.Cuotas.");
        }

        var (desde, hasta) = ResolverRangoPeriodo(request.Mes, request.Anio);
        var hoyDt = HoyMexico().ToDateTime(TimeOnly.MinValue);

        var residentes = MapResidentesMoras(request.Residentes);
        if (residentes is null)
        {
            return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest,
                "Seleccione al menos un moroso.");
        }

        var (actualizadas, omitidas) = await _morosos.AplicarMorasAsync(
            request.MontoMora,
            hoyDt,
            desde,
            hasta,
            residentes,
            adminCorreo,
            adminId,
            ct);

        return (new MorasBatchResultDto { Actualizadas = actualizadas, Omitidas = omitidas },
            null,
            StatusCodes.Status200OK,
            null);
    }

    public async Task<(MorasBatchResultDto? Data, string? Code, int Status, string? Detail)> CondonarMorasMorososAsync(
        CondonarMorasRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        if (!_morosos.TieneColumnaMontoMora)
        {
            return (null, "FNZ_MORA_NO_CONFIGURADA", StatusCodes.Status422UnprocessableEntity,
                "Ejecute el script SQL de MontoMora en fnz.Cuotas.");
        }

        var (desde, hasta) = ResolverRangoPeriodo(request.Mes, request.Anio);
        var hoyDt = HoyMexico().ToDateTime(TimeOnly.MinValue);

        var residentes = MapResidentesMoras(request.Residentes);
        if (residentes is null)
        {
            return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest,
                "Seleccione al menos un moroso.");
        }

        var actualizadas = await _morosos.CondonarMorasAsync(
            hoyDt,
            desde,
            hasta,
            residentes,
            adminCorreo,
            adminId,
            ct);

        return (new MorasBatchResultDto { Actualizadas = actualizadas, Omitidas = 0 },
            null,
            StatusCodes.Status200OK,
            null);
    }

    private static (DateTime? Desde, DateTime? Hasta) ResolverRangoPeriodo(int? mes, int? anio)
    {
        if (mes is null || anio is null)
        {
            return (null, null);
        }

        var desde = new DateTime(anio.Value, mes.Value, 1);
        return (desde, desde.AddMonths(1));
    }

    private static IReadOnlyList<MorosoMorasTargetRow>? MapResidentesMoras(List<MorosoMorasTargetDto>? residentes)
    {
        if (residentes is null || residentes.Count == 0)
        {
            return null;
        }

        return residentes
            .Where(r => r.UsuarioId > 0)
            .Select(r => new MorosoMorasTargetRow { UsuarioId = r.UsuarioId, CasaId = r.CasaId })
            .ToList() is { Count: > 0 } list
            ? list
            : null;
    }

    internal DateOnly HoyMexico()
    {
        var utc = _time.GetUtcNow().UtcDateTime;
        var local = TimeZoneInfo.ConvertTimeFromUtc(utc, MexicoCity);
        return DateOnly.FromDateTime(local);
    }
}
