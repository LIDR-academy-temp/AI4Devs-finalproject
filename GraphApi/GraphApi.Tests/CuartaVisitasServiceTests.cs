using System.Data;
using GraphApi.Models.VTS.CuartaVisitas;
using GraphApi.Repositories.VTS;
using GraphApi.Services.VTS.CuartaVisitas;
using Moq;
using Xunit;

namespace GraphApi.Tests;

public class CuartaVisitasServiceTests
{
    private readonly Mock<ICuartaVisitasRepository> _repoMock = new();
    private readonly Mock<IDbConnection> _dbMock = new();
    private readonly Mock<IDbTransaction> _txMock = new();
    private readonly CuartaVisitasService _sut;

    public CuartaVisitasServiceTests()
    {
        _dbMock.Setup(d => d.State).Returns(ConnectionState.Open);
        _dbMock.Setup(d => d.BeginTransaction()).Returns(_txMock.Object);
        _sut = new CuartaVisitasService(_repoMock.Object, _dbMock.Object);
    }

    // ── RegistrarEntrada ─────────────────────────────────────────────────────

    [Fact]
    public async Task RegistrarEntrada_NombreVacio_Retorna422()
    {
        var req = new RegistrarVisitaRequest
        {
            VisitanteNombre = "",
            NumeroIdentificacion = "12345678",
            TipoIdentificacion = "INE",
        };
        var (visita, code, status, _) = await _sut.RegistrarEntradaAsync(req, "admin@test.com", 1);

        Assert.Null(visita);
        Assert.Equal("VTS_NOMBRE_REQUERIDO", code);
        Assert.Equal(422, status);
    }

    [Fact]
    public async Task RegistrarEntrada_IdentificacionVacia_Retorna422()
    {
        var req = new RegistrarVisitaRequest
        {
            VisitanteNombre = "Juan Pérez",
            NumeroIdentificacion = "  ",
            TipoIdentificacion = "INE",
        };
        var (visita, code, status, _) = await _sut.RegistrarEntradaAsync(req, "admin@test.com", 1);

        Assert.Null(visita);
        Assert.Equal("VTS_IDENTIFICACION_REQUERIDA", code);
        Assert.Equal(422, status);
    }

    [Fact]
    public async Task RegistrarEntrada_TipoIdentNoEncontrado_Retorna422()
    {
        _repoMock.Setup(r => r.ResolverTipoIdentificacionIdAsync("INVALIDO", _txMock.Object))
                 .ReturnsAsync((int?)null);

        var req = new RegistrarVisitaRequest
        {
            VisitanteNombre = "Juan Pérez",
            NumeroIdentificacion = "12345678",
            TipoIdentificacion = "INVALIDO",
        };
        var (visita, code, status, _) = await _sut.RegistrarEntradaAsync(req, "admin@test.com", 1);

        Assert.Null(visita);
        Assert.Equal("VTS_TIPO_IDENT_INVALIDO", code);
        Assert.Equal(422, status);
    }

    [Fact]
    public async Task RegistrarEntrada_Valido_InsertaYRetorna201()
    {
        _repoMock.Setup(r => r.ResolverTipoIdentificacionIdAsync("INE", _txMock.Object))
                 .ReturnsAsync(1);
        _repoMock.Setup(r => r.InsertVisitaAsync(It.IsAny<RegistrarVisitaRequest>(), 1,
                         "admin@test.com", 1, _txMock.Object))
                 .ReturnsAsync(42);

        var req = new RegistrarVisitaRequest
        {
            VisitanteNombre = "Juan Pérez",
            NumeroIdentificacion = "12345678",
            TipoIdentificacion = "INE",
        };
        var (visita, code, status, _) = await _sut.RegistrarEntradaAsync(req, "admin@test.com", 1);

        Assert.NotNull(visita);
        Assert.Null(code);
        Assert.Equal(201, status);
        Assert.Equal(42, visita!.VisitaId);
        _txMock.Verify(t => t.Commit(), Times.Once);
    }

    // ── RegistrarSalida ──────────────────────────────────────────────────────

    [Fact]
    public async Task RegistrarSalida_NotFound_Retorna404()
    {
        _repoMock.Setup(r => r.RegistrarSalidaAsync(99, "admin@test.com", 1, _txMock.Object))
                 .ReturnsAsync(false);

        var (ok, code, status, _) = await _sut.RegistrarSalidaAsync(99, "admin@test.com", 1);

        Assert.False(ok);
        Assert.Equal("VTS_NOT_FOUND_OR_SALIDA", code);
        Assert.Equal(404, status);
    }

    [Fact]
    public async Task RegistrarSalida_Valido_Retorna204()
    {
        _repoMock.Setup(r => r.RegistrarSalidaAsync(5, "admin@test.com", 1, _txMock.Object))
                 .ReturnsAsync(true);

        var (ok, code, status, _) = await _sut.RegistrarSalidaAsync(5, "admin@test.com", 1);

        Assert.True(ok);
        Assert.Null(code);
        Assert.Equal(204, status);
        _txMock.Verify(t => t.Commit(), Times.Once);
    }

    // ── CrearReservacion ─────────────────────────────────────────────────────

    [Fact]
    public async Task CrearReservacion_FechasInvalidas_Retorna422()
    {
        var ahora = DateTime.UtcNow;
        var req = new CrearReservacionRequest
        {
            AreaComunId = 1,
            FechaInicio = ahora.AddHours(2),
            FechaFin    = ahora.AddHours(1), // fin < inicio
        };
        var (res, code, status, _) = await _sut.CrearReservacionAsync(req, "usr@test.com", 2);

        Assert.Null(res);
        Assert.Equal("VTS_FECHAS_INVALIDAS", code);
        Assert.Equal(422, status);
    }

    [Fact]
    public async Task CrearReservacion_Solapamiento_Retorna409()
    {
        var ahora = DateTime.UtcNow;
        _repoMock.Setup(r => r.ObtenerAreaAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AreaComunDto { AreaComunId = 1, Nombre = "Salon", RequiereReservacion = true });
        _repoMock.Setup(r => r.HaySolapamientoAsync(1, It.IsAny<DateTime>(), It.IsAny<DateTime>(),
                         null, _txMock.Object))
                 .ReturnsAsync(true);

        var req = new CrearReservacionRequest
        {
            AreaComunId = 1,
            FechaInicio = ahora.AddHours(1),
            FechaFin    = ahora.AddHours(3),
        };
        var (res, code, status, _) = await _sut.CrearReservacionAsync(req, "usr@test.com", 2);

        Assert.Null(res);
        Assert.Equal("VTS_SOLAPAMIENTO", code);
        Assert.Equal(409, status);
    }

    [Fact]
    public async Task CrearReservacion_Valido_InsertaYRetorna201()
    {
        var ahora = DateTime.UtcNow;
        _repoMock.Setup(r => r.ObtenerAreaAsync(1, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AreaComunDto { AreaComunId = 1, Nombre = "Salon", RequiereReservacion = true });
        _repoMock.Setup(r => r.HaySolapamientoAsync(1, It.IsAny<DateTime>(), It.IsAny<DateTime>(),
                         null, _txMock.Object))
                 .ReturnsAsync(false);
        _repoMock.Setup(r => r.ResolverEstadoReservacionIdAsync("Pendiente", _txMock.Object))
                 .ReturnsAsync(3);
        _repoMock.Setup(r => r.InsertReservacionAsync(It.IsAny<CrearReservacionRequest>(), 3,
                         It.IsAny<string>(), 2, 2, _txMock.Object))
                 .ReturnsAsync(10);
        _repoMock.Setup(r => r.ObtenerReservacionAsync(10, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new ReservacionAreaDto
                 {
                     ReservacionAreaId = 10,
                     AreaComunId       = 1,
                     FechaInicio       = ahora.AddHours(1),
                     FechaFin          = ahora.AddHours(3),
                     Estado            = "Pendiente",
                 });

        var req = new CrearReservacionRequest
        {
            AreaComunId = 1,
            FechaInicio = ahora.AddHours(1),
            FechaFin    = ahora.AddHours(3),
        };
        var (res, code, status, _) = await _sut.CrearReservacionAsync(req, "usr@test.com", 2);

        Assert.NotNull(res);
        Assert.Null(code);
        Assert.Equal(201, status);
        _txMock.Verify(t => t.Commit(), Times.Once);
    }

    // ── Calendario reservaciones ─────────────────────────────────────────────

    [Fact]
    public async Task TC_VTS_C_1_ListarCalendario_RangoValido_DelegaAlRepositorio()
    {
        var desde = new DateTime(2026, 10, 27, 0, 0, 0, DateTimeKind.Utc);
        var hasta = new DateTime(2026, 11, 3, 0, 0, 0, DateTimeKind.Utc);
        var esperados = new List<ReservacionCalendarioDto>
        {
            new()
            {
                ReservacionAreaId = 1,
                AreaComunId = 5,
                FechaInicio = desde.AddHours(10),
                FechaFin = desde.AddHours(12),
                Estado = "Confirmada",
                Etiqueta = "Terraza (Reservado)",
            },
        };
        _repoMock.Setup(r => r.ListarReservacionesCalendarioAsync(5, desde, hasta, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(esperados);

        var (eventos, code, status, _) =
            await _sut.ListarReservacionesCalendarioAsync(5, desde, hasta);

        Assert.Null(code);
        Assert.Equal(200, status);
        Assert.Single(eventos!);
        Assert.Equal("Terraza (Reservado)", eventos![0].Etiqueta);
    }

    [Fact]
    public async Task TC_VTS_C_2_ListarCalendario_ExcluyeCanceladasEnProyeccion()
    {
        var desde = new DateTime(2026, 10, 27, 0, 0, 0, DateTimeKind.Utc);
        var hasta = new DateTime(2026, 11, 3, 0, 0, 0, DateTimeKind.Utc);
        _repoMock.Setup(r => r.ListarReservacionesCalendarioAsync(5, desde, hasta, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new List<ReservacionCalendarioDto>
                 {
                     new()
                     {
                         ReservacionAreaId = 1,
                         AreaComunId = 5,
                         FechaInicio = desde.AddHours(10),
                         FechaFin = desde.AddHours(12),
                         Estado = "Confirmada",
                         Etiqueta = "Terraza (Reservado)",
                     },
                 });

        var (eventos, code, status, _) =
            await _sut.ListarReservacionesCalendarioAsync(5, desde, hasta);

        Assert.Null(code);
        Assert.Equal(200, status);
        Assert.All(eventos!, e => Assert.NotEqual("Cancelada", e.Estado));
        Assert.Empty(eventos!.Where(e => e.Estado == "Cancelada"));
    }

    [Fact]
    public async Task ListarCalendario_AreaInvalida_Retorna422()
    {
        var (eventos, code, status, _) =
            await _sut.ListarReservacionesCalendarioAsync(-1, DateTime.UtcNow, DateTime.UtcNow.AddDays(7));

        Assert.Null(eventos);
        Assert.Equal("VTS_AREA_INVALIDA", code);
        Assert.Equal(422, status);
    }

    [Fact]
    public async Task ListarCalendario_RangoExcesivo_Retorna422()
    {
        var desde = DateTime.UtcNow;
        var (eventos, code, status, _) =
            await _sut.ListarReservacionesCalendarioAsync(1, desde, desde.AddDays(63));

        Assert.Null(eventos);
        Assert.Equal("VTS_RANGO_EXCESIVO", code);
        Assert.Equal(422, status);
    }

    [Fact]
    public async Task ActualizarEstadoReserva_EstadoInvalido_Retorna422()
    {
        var (ok, code, status, _) =
            await _sut.ActualizarEstadoReservacionAdminAsync(1, "Cancelada", "admin@local", 1);

        Assert.False(ok);
        Assert.Equal("VTS_ESTADO_INVALIDO", code);
        Assert.Equal(422, status);
    }

    [Fact]
    public async Task ActualizarEstadoReserva_DelegaAlRepositorio()
    {
        _repoMock.Setup(r => r.ActualizarEstadoReservacionAsync(7, "Confirmada", "admin@local", 2, It.IsAny<IDbTransaction?>()))
                 .ReturnsAsync(true);

        var (ok, code, status, _) =
            await _sut.ActualizarEstadoReservacionAdminAsync(7, "Confirmada", "admin@local", 2);

        Assert.True(ok);
        Assert.Null(code);
        Assert.Equal(204, status);
    }

    [Fact]
    public async Task CrearReservacion_AreaNoReservable_Retorna422()
    {
        _repoMock.Setup(r => r.ObtenerAreaAsync(2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new AreaComunDto { AreaComunId = 2, Nombre = "Jardin", RequiereReservacion = false });
        var req = new CrearReservacionRequest
        {
            AreaComunId = 2,
            FechaInicio = DateTime.UtcNow.AddHours(1),
            FechaFin = DateTime.UtcNow.AddHours(2),
        };
        var (res, code, status, _) = await _sut.CrearReservacionAsync(req, "u@t.com", 1);
        Assert.Null(res);
        Assert.Equal("VTS_AREA_NO_RESERVABLE", code);
        Assert.Equal(422, status);
    }

    [Fact]
    public async Task CrearAreaComun_NombreVacio_Retorna400()
    {
        var (data, code, status, _) = await _sut.CrearAreaComunAsync(
            new AreaComunUpsertRequest { Nombre = "  " }, "admin@t.com", 1);
        Assert.Null(data);
        Assert.Equal("VTS_AREA_NOMBRE_REQUERIDO", code);
        Assert.Equal(400, status);
    }

    [Fact]
    public async Task CancelarReservacionAdmin_NoEncontrada_Retorna404()
    {
        _repoMock.Setup(r => r.CancelarReservacionAsync(99, It.IsAny<string>(), It.IsAny<int>(), null))
            .ReturnsAsync(false);
        var (ok, code, status, _) = await _sut.CancelarReservacionAdminAsync(99, "admin@t.com", 1);
        Assert.False(ok);
        Assert.Equal("VTS_RESERVA_NO_ENCONTRADA", code);
        Assert.Equal(404, status);
    }
}
