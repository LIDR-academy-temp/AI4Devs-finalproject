using System.Data;
using GraphApi.Infrastructure;
using Microsoft.AspNetCore.Http;
using GraphApi.Models.FNZ;
using GraphApi.Models.NTF;
using GraphApi.Repositories.FNZ;
using GraphApi.Services.FNZ;
using GraphApi.Services.NTF;
using Moq;

namespace GraphApi.Tests;

public class FinanzasServiceRegistrarPagoTests
{
    private static readonly DateTimeOffset MexicoMorningUtc =
        new(2026, 10, 16, 18, 0, 0, TimeSpan.Zero);

    private static FinanzasService CreateSut(
        Mock<ICuotaPagoRepository> pago,
        Mock<INotificacionService> notificaciones,
        Mock<IUnitOfWork> uow,
        out Mock<IDbTransaction> tx)
    {
        tx = new Mock<IDbTransaction>();
        uow.Setup(u => u.BeginTransaction()).Returns(tx.Object);

        var cuotas = new Mock<ICuotaEstadoCuentaRepository>();
        var generacion = new Mock<ICuotaGeneracionRepository>();
        var morosos = new Mock<IMorososRepository>();
        var transacciones = new Mock<ITransaccionesFnzRepository>();
        transacciones
            .Setup(t => t.AjustarSaldoCuentaAsync(It.IsAny<int>(), It.IsAny<decimal>(), It.IsAny<IDbTransaction>()))
            .ReturnsAsync(true);

        return new FinanzasService(
            cuotas.Object,
            generacion.Object,
            new Mock<ITiposCuentaFnzRepository>().Object,
            new Mock<ITiposMovimientoFnzRepository>().Object,
            transacciones.Object,
            pago.Object,
            morosos.Object,
            notificaciones.Object,
            uow.Object,
            new FixedTimeProvider(MexicoMorningUtc));
    }

    [Fact]
    public async Task RegistrarPago_happy_path_commits_and_returns_204()
    {
        var pago = new Mock<ICuotaPagoRepository>();
        pago.SetupGet(x => x.TieneColumnaCuentaId).Returns(true);
        var notif = new Mock<INotificacionService>();
        var uow = new Mock<IUnitOfWork>();
        var sut = CreateSut(pago, notif, uow, out var tx);

        pago.Setup(x => x.ObtenerConBloqueoAsync(50, tx.Object))
            .ReturnsAsync(new CuotaPagoRow
            {
                CuotaId = 50,
                UsuarioId = 10,
                CuentaId = 1,
                Monto = 1200m,
                Pagado = false,
                PeriodoInicio = new DateTime(2026, 10, 1),
            });
        pago.Setup(x => x.MarcarPagadaAsync(
                50,
                It.IsAny<DateTime>(),
                1200m,
                "Transferencia",
                "REF-001",
                "admin@test.com",
                1,
                tx.Object))
            .ReturnsAsync(1);
        pago.Setup(x => x.InsertarTransaccionPagoAsync(
                1,
                10,
                1200m,
                "Pago cuota #50",
                "admin@test.com",
                1,
                tx.Object))
            .ReturnsAsync(1);
        notif.Setup(n => n.NotificarUsuarioAsync(
                tx.Object,
                10,
                "PAGO_REGISTRADO",
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<NotificacionAutor>()))
            .ReturnsAsync(1);

        var request = new RegistrarPagoRequest
        {
            MontoPagado = 1200m,
            FechaPago = new DateTime(2026, 10, 16),
            MetodoPago = "Transferencia",
            ReferenciaPago = "REF-001",
        };

        var (ok, code, status, _) = await sut.RegistrarPagoAsync(50, request, 1, "admin@test.com");

        Assert.True(ok);
        Assert.Null(code);
        Assert.Equal(StatusCodes.Status204NoContent, status);
        uow.Verify(u => u.Commit(), Times.Once);
        uow.Verify(u => u.Rollback(), Times.Never);
    }

    [Fact]
    public async Task RegistrarPago_monto_distinto_returns_422()
    {
        var pago = new Mock<ICuotaPagoRepository>();
        pago.SetupGet(x => x.TieneColumnaCuentaId).Returns(true);
        var notif = new Mock<INotificacionService>();
        var uow = new Mock<IUnitOfWork>();
        var sut = CreateSut(pago, notif, uow, out var tx);

        pago.Setup(x => x.ObtenerConBloqueoAsync(50, tx.Object))
            .ReturnsAsync(new CuotaPagoRow
            {
                CuotaId = 50,
                UsuarioId = 10,
                CuentaId = 1,
                Monto = 1200m,
                Pagado = false,
                PeriodoInicio = new DateTime(2026, 10, 1),
            });

        var request = new RegistrarPagoRequest
        {
            MontoPagado = 600m,
            FechaPago = new DateTime(2026, 10, 16),
            ReferenciaPago = "REF-001",
        };

        var (ok, code, status, detail) = await sut.RegistrarPagoAsync(50, request, 1, "admin@test.com");

        Assert.False(ok);
        Assert.Equal("VALIDATION_ERROR", code);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, status);
        Assert.Contains("pagos parciales", detail, StringComparison.OrdinalIgnoreCase);
        uow.Verify(u => u.Rollback(), Times.Once);
        pago.Verify(x => x.MarcarPagadaAsync(
            It.IsAny<int>(),
            It.IsAny<DateTime>(),
            It.IsAny<decimal>(),
            It.IsAny<string?>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<int>(),
            It.IsAny<IDbTransaction>()), Times.Never);
    }

    [Fact]
    public async Task RegistrarPago_ya_pagada_returns_409()
    {
        var pago = new Mock<ICuotaPagoRepository>();
        var notif = new Mock<INotificacionService>();
        var uow = new Mock<IUnitOfWork>();
        var sut = CreateSut(pago, notif, uow, out var tx);

        pago.Setup(x => x.ObtenerConBloqueoAsync(50, tx.Object))
            .ReturnsAsync(new CuotaPagoRow
            {
                CuotaId = 50,
                UsuarioId = 10,
                Monto = 1200m,
                Pagado = true,
                PeriodoInicio = new DateTime(2026, 10, 1),
            });

        var request = new RegistrarPagoRequest
        {
            MontoPagado = 1200m,
            FechaPago = new DateTime(2026, 10, 16),
            ReferenciaPago = "REF-001",
        };

        var (ok, code, status, _) = await sut.RegistrarPagoAsync(50, request, 1, "admin@test.com");

        Assert.False(ok);
        Assert.Equal("CONFLICT", code);
        Assert.Equal(StatusCodes.Status409Conflict, status);
        uow.Verify(u => u.Rollback(), Times.Once);
    }

    [Fact]
    public async Task RegistrarPago_cuota_inexistente_returns_404()
    {
        var pago = new Mock<ICuotaPagoRepository>();
        var notif = new Mock<INotificacionService>();
        var uow = new Mock<IUnitOfWork>();
        var sut = CreateSut(pago, notif, uow, out var tx);

        pago.Setup(x => x.ObtenerConBloqueoAsync(9999, tx.Object))
            .ReturnsAsync((CuotaPagoRow?)null);

        var request = new RegistrarPagoRequest
        {
            MontoPagado = 1200m,
            FechaPago = new DateTime(2026, 10, 16),
            ReferenciaPago = "REF-001",
        };

        var (ok, code, status, _) = await sut.RegistrarPagoAsync(9999, request, 1, "admin@test.com");

        Assert.False(ok);
        Assert.Equal("NOT_FOUND", code);
        Assert.Equal(StatusCodes.Status404NotFound, status);
    }

    [Fact]
    public async Task RegistrarPago_fecha_futura_returns_400()
    {
        var pago = new Mock<ICuotaPagoRepository>();
        var notif = new Mock<INotificacionService>();
        var uow = new Mock<IUnitOfWork>();
        var sut = CreateSut(pago, notif, uow, out _);

        var request = new RegistrarPagoRequest
        {
            MontoPagado = 1200m,
            FechaPago = new DateTime(2026, 10, 17),
            ReferenciaPago = "REF-001",
        };

        var (ok, code, status, _) = await sut.RegistrarPagoAsync(50, request, 1, "admin@test.com");

        Assert.False(ok);
        Assert.Equal("VALIDATION_ERROR", code);
        Assert.Equal(StatusCodes.Status400BadRequest, status);
        uow.Verify(u => u.BeginTransaction(), Times.Never);
    }

    [Fact]
    public async Task RegistrarPago_notificacion_falla_hace_rollback_CA9()
    {
        var pago = new Mock<ICuotaPagoRepository>();
        pago.SetupGet(x => x.TieneColumnaCuentaId).Returns(true);
        var notif = new Mock<INotificacionService>();
        var uow = new Mock<IUnitOfWork>();
        var sut = CreateSut(pago, notif, uow, out var tx);

        pago.Setup(x => x.ObtenerConBloqueoAsync(50, tx.Object))
            .ReturnsAsync(new CuotaPagoRow
            {
                CuotaId = 50,
                UsuarioId = 10,
                CuentaId = 1,
                Monto = 1200m,
                Pagado = false,
                PeriodoInicio = new DateTime(2026, 10, 1),
            });
        pago.Setup(x => x.MarcarPagadaAsync(
                It.IsAny<int>(),
                It.IsAny<DateTime>(),
                It.IsAny<decimal>(),
                It.IsAny<string?>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                tx.Object))
            .ReturnsAsync(1);
        pago.Setup(x => x.InsertarTransaccionPagoAsync(
                It.IsAny<int>(),
                It.IsAny<int>(),
                It.IsAny<decimal>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                tx.Object))
            .ReturnsAsync(1);
        notif.Setup(n => n.NotificarUsuarioAsync(
                tx.Object,
                It.IsAny<int>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<NotificacionAutor>()))
            .ThrowsAsync(new InvalidOperationException("tipo PAGO_REGISTRADO ausente"));

        var request = new RegistrarPagoRequest
        {
            MontoPagado = 1200m,
            FechaPago = new DateTime(2026, 10, 16),
            ReferenciaPago = "REF-001",
        };

        await Assert.ThrowsAsync<InvalidOperationException>(() =>
            sut.RegistrarPagoAsync(50, request, 1, "admin@test.com"));

        uow.Verify(u => u.Rollback(), Times.Once);
        uow.Verify(u => u.Commit(), Times.Never);
    }

    [Fact]
    public async Task RegistrarPago_sin_tipo_movimiento_returns_422_CA10()
    {
        var pago = new Mock<ICuotaPagoRepository>();
        pago.SetupGet(x => x.TieneColumnaCuentaId).Returns(true);
        var notif = new Mock<INotificacionService>();
        var uow = new Mock<IUnitOfWork>();
        var sut = CreateSut(pago, notif, uow, out var tx);

        pago.Setup(x => x.ObtenerConBloqueoAsync(50, tx.Object))
            .ReturnsAsync(new CuotaPagoRow
            {
                CuotaId = 50,
                UsuarioId = 10,
                CuentaId = 1,
                Monto = 1200m,
                Pagado = false,
                PeriodoInicio = new DateTime(2026, 10, 1),
            });
        pago.Setup(x => x.MarcarPagadaAsync(
                It.IsAny<int>(),
                It.IsAny<DateTime>(),
                It.IsAny<decimal>(),
                It.IsAny<string?>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                tx.Object))
            .ReturnsAsync(1);
        pago.Setup(x => x.InsertarTransaccionPagoAsync(
                It.IsAny<int>(),
                It.IsAny<int>(),
                It.IsAny<decimal>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                tx.Object))
            .ReturnsAsync(0);

        var request = new RegistrarPagoRequest
        {
            MontoPagado = 1200m,
            FechaPago = new DateTime(2026, 10, 16),
            ReferenciaPago = "REF-001",
        };

        var (ok, code, status, detail) = await sut.RegistrarPagoAsync(50, request, 1, "admin@test.com");

        Assert.False(ok);
        Assert.Equal("VALIDATION_ERROR", code);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, status);
        Assert.Contains("Pago de cuota", detail, StringComparison.OrdinalIgnoreCase);
        uow.Verify(u => u.Rollback(), Times.Once);
        notif.Verify(n => n.NotificarUsuarioAsync(
            It.IsAny<IDbTransaction>(),
            It.IsAny<int>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<string>(),
            It.IsAny<NotificacionAutor>()), Times.Never);
    }

    [Fact]
    public async Task RegistrarPago_update_cero_filas_returns_409_CA3_perdedor()
    {
        var pago = new Mock<ICuotaPagoRepository>();
        pago.SetupGet(x => x.TieneColumnaCuentaId).Returns(true);
        var notif = new Mock<INotificacionService>();
        var uow = new Mock<IUnitOfWork>();
        var sut = CreateSut(pago, notif, uow, out var tx);

        pago.Setup(x => x.ObtenerConBloqueoAsync(50, tx.Object))
            .ReturnsAsync(new CuotaPagoRow
            {
                CuotaId = 50,
                UsuarioId = 10,
                CuentaId = 1,
                Monto = 1200m,
                Pagado = false,
                PeriodoInicio = new DateTime(2026, 10, 1),
            });
        pago.Setup(x => x.MarcarPagadaAsync(
                It.IsAny<int>(),
                It.IsAny<DateTime>(),
                It.IsAny<decimal>(),
                It.IsAny<string?>(),
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<int>(),
                tx.Object))
            .ReturnsAsync(0);

        var request = new RegistrarPagoRequest
        {
            MontoPagado = 1200m,
            FechaPago = new DateTime(2026, 10, 16),
            ReferenciaPago = "REF-001",
        };

        var (ok, code, status, _) = await sut.RegistrarPagoAsync(50, request, 1, "admin@test.com");

        Assert.False(ok);
        Assert.Equal("CONFLICT", code);
        Assert.Equal(StatusCodes.Status409Conflict, status);
    }

    [Fact]
    public async Task RegistrarPago_happy_path_notifica_PAGO_REGISTRADO_y_abono_CA_R1_R2()
    {
        var pago = new Mock<ICuotaPagoRepository>();
        pago.SetupGet(x => x.TieneColumnaCuentaId).Returns(true);
        var notif = new Mock<INotificacionService>();
        var uow = new Mock<IUnitOfWork>();
        var sut = CreateSut(pago, notif, uow, out var tx);

        pago.Setup(x => x.ObtenerConBloqueoAsync(50, tx.Object))
            .ReturnsAsync(new CuotaPagoRow
            {
                CuotaId = 50,
                UsuarioId = 10,
                CuentaId = 1,
                Monto = 1200m,
                Pagado = false,
                PeriodoInicio = new DateTime(2026, 10, 1),
            });
        pago.Setup(x => x.MarcarPagadaAsync(
                50,
                It.IsAny<DateTime>(),
                1200m,
                It.IsAny<string?>(),
                "REF-001",
                "admin@test.com",
                1,
                tx.Object))
            .ReturnsAsync(1);
        pago.Setup(x => x.InsertarTransaccionPagoAsync(
                1,
                10,
                1200m,
                "Pago cuota #50",
                "admin@test.com",
                1,
                tx.Object))
            .ReturnsAsync(1);
        notif.Setup(n => n.NotificarUsuarioAsync(
                tx.Object,
                10,
                "PAGO_REGISTRADO",
                It.IsAny<string>(),
                It.IsAny<string>(),
                It.IsAny<NotificacionAutor>()))
            .ReturnsAsync(1);

        var request = new RegistrarPagoRequest
        {
            MontoPagado = 1200m,
            FechaPago = new DateTime(2026, 10, 16),
            MetodoPago = "Transferencia",
            ReferenciaPago = "REF-001",
        };

        await sut.RegistrarPagoAsync(50, request, 1, "admin@test.com");

        pago.Verify(x => x.InsertarTransaccionPagoAsync(
            1, 10, 1200m, "Pago cuota #50", "admin@test.com", 1, tx.Object), Times.Once);
        notif.Verify(n => n.NotificarUsuarioAsync(
            tx.Object, 10, "PAGO_REGISTRADO", It.IsAny<string>(), It.IsAny<string>(), It.IsAny<NotificacionAutor>()),
            Times.Once);
    }

    private sealed class FixedTimeProvider : TimeProvider
    {
        private readonly DateTimeOffset _utcNow;

        public FixedTimeProvider(DateTimeOffset utcNow) => _utcNow = utcNow;

        public override DateTimeOffset GetUtcNow() => _utcNow;
    }
}
