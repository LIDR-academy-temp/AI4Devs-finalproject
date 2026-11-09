using System.Data;
using GraphApi.Models.WMS.CuartaAlmacen;
using GraphApi.Repositories.WMS;
using GraphApi.Services.WMS.CuartaAlmacen;
using Moq;
using Xunit;

namespace GraphApi.Tests;

public class CuartaAlmacenServiceTests
{
    private static ICuartaAlmacenService BuildService(
        out Mock<ICuartaAlmacenRepository> repoMock,
        out Mock<IDbConnection> connMock,
        out Mock<IDbTransaction> txMock)
    {
        repoMock = new Mock<ICuartaAlmacenRepository>();
        connMock = new Mock<IDbConnection>();
        txMock   = new Mock<IDbTransaction>();
        connMock.Setup(c => c.State).Returns(ConnectionState.Closed);
        connMock.Setup(c => c.BeginTransaction()).Returns(txMock.Object);
        return new CuartaAlmacenService(repoMock.Object, connMock.Object);
    }

    // ── CA-1: Préstamo baja stock correctamente ────────────────────────────────

    [Fact]
    public async Task Prestar_StockSuficiente_BajaStockYDevuelve201()
    {
        var svc = BuildService(out var repo, out _, out var tx);

        repo.Setup(r => r.ExisteArticuloAsync(1, It.IsAny<IDbTransaction>())).ReturnsAsync(true);
        repo.Setup(r => r.ObtenerStockAsync(1, It.IsAny<IDbTransaction>())).ReturnsAsync(10);
        repo.Setup(r => r.InsertPrestamoAsync(It.IsAny<PrestamoCrearRequest>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<IDbTransaction>()))
            .ReturnsAsync(42);

        var req = new PrestamoCrearRequest(ArticuloId: 1, UsuarioId: 5, Cantidad: 3, Notas: null);
        var (code, id, error) = await svc.PrestarAsync(req, "admin@e.com", 1);

        Assert.Equal(201, code);
        Assert.Equal(42, id);
        repo.Verify(r => r.AjustarStockAsync(1, -3, It.IsAny<string>(), It.IsAny<int>(), It.IsAny<IDbTransaction>()), Times.Once);
        tx.Verify(t => t.Commit(), Times.Once);
    }

    // ── CA-2: Devolución restablece stock ─────────────────────────────────────

    [Fact]
    public async Task Devolver_PrestamoActivo_ResumeStockYDevuelve204()
    {
        var svc = BuildService(out var repo, out _, out var tx);

        var prestamo = new PrestamoListItemDto(
            PrestamoId: 7, ArticuloId: 1, NombreArticulo: "Martillo",
            UsuarioId: 5, NombreUsuario: "Juan", CorreoUsuario: "j@e.com",
            Cantidad: 2, FechaPrestamo: DateTime.UtcNow, FechaDevolucion: null,
            Estado: "PRESTADO", Notas: null);

        repo.Setup(r => r.ObtenerPrestamoAsync(7)).ReturnsAsync(prestamo);
        repo.Setup(r => r.EsPrestamoActivoAsync(7, It.IsAny<IDbTransaction>())).ReturnsAsync(true);

        var (code, error) = await svc.DevolverAsync(7, "admin@e.com", 1);

        Assert.Equal(204, code);
        repo.Verify(r => r.AjustarStockAsync(1, 2, It.IsAny<string>(), It.IsAny<int>(), It.IsAny<IDbTransaction>()), Times.Once);
        repo.Verify(r => r.DevolverPrestamoAsync(7, It.IsAny<string>(), It.IsAny<int>(), It.IsAny<IDbTransaction>()), Times.Once);
        tx.Verify(t => t.Commit(), Times.Once);
    }

    // ── CA-3: Stock negativo → 409 ────────────────────────────────────────────

    [Fact]
    public async Task Prestar_StockInsuficiente_Devuelve409SinCommit()
    {
        var svc = BuildService(out var repo, out _, out var tx);

        repo.Setup(r => r.ExisteArticuloAsync(1, It.IsAny<IDbTransaction>())).ReturnsAsync(true);
        repo.Setup(r => r.ObtenerStockAsync(1, It.IsAny<IDbTransaction>())).ReturnsAsync(1);  // solo 1 en stock

        var req = new PrestamoCrearRequest(ArticuloId: 1, UsuarioId: 5, Cantidad: 5, Notas: null);
        var (code, id, error) = await svc.PrestarAsync(req, "admin@e.com", 1);

        Assert.Equal(409, code);
        Assert.Null(id);
        Assert.Contains("INV-1", error);
        repo.Verify(r => r.AjustarStockAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<IDbTransaction>()), Times.Never);
        tx.Verify(t => t.Commit(), Times.Never);
        tx.Verify(t => t.Rollback(), Times.Once);
    }

    // ── Crear artículo con nombre vacío → 422 ─────────────────────────────────

    [Fact]
    public async Task CrearArticulo_NombreVacio_Devuelve422()
    {
        var svc = BuildService(out _, out _, out _);
        var req = new ArticuloCrearRequest(Nombre: "", CategoriaId: null, Stock: 5, StockMinimo: 1, Ubicacion: null);
        var (code, id, error) = await svc.CrearArticuloAsync(req, "admin@e.com", 1);
        Assert.Equal(422, code);
        Assert.Null(id);
    }

    // ── Crear artículo stock negativo → 422 ───────────────────────────────────

    [Fact]
    public async Task CrearArticulo_StockNegativo_Devuelve422()
    {
        var svc = BuildService(out _, out _, out _);
        var req = new ArticuloCrearRequest(Nombre: "Sierra", CategoriaId: null, Stock: -1, StockMinimo: 1, Ubicacion: null);
        var (code, id, error) = await svc.CrearArticuloAsync(req, "admin@e.com", 1);
        Assert.Equal(422, code);
    }

    // ── Actualizar artículo no encontrado → 404 ───────────────────────────────

    [Fact]
    public async Task ActualizarArticulo_NoExiste_Devuelve404()
    {
        var svc = BuildService(out var repo, out _, out _);
        repo.Setup(r => r.ExisteArticuloAsync(99, It.IsAny<IDbTransaction>())).ReturnsAsync(false);
        var req = new ArticuloActualizarRequest(Nombre: "X", CategoriaId: null, Stock: null, StockMinimo: null, Ubicacion: null);
        var (code, error) = await svc.ActualizarArticuloAsync(99, req, "admin@e.com", 1);
        Assert.Equal(404, code);
    }

    // ── Devolver préstamo ya devuelto → 404 ───────────────────────────────────

    [Fact]
    public async Task Devolver_PrestamoYaDevuelto_Devuelve404()
    {
        var svc = BuildService(out var repo, out _, out _);
        var prestamo = new PrestamoListItemDto(
            PrestamoId: 7, ArticuloId: 1, NombreArticulo: "Martillo",
            UsuarioId: 5, NombreUsuario: "Juan", CorreoUsuario: "j@e.com",
            Cantidad: 2, FechaPrestamo: DateTime.UtcNow, FechaDevolucion: DateTime.UtcNow,
            Estado: "DEVUELTO", Notas: null);

        repo.Setup(r => r.ObtenerPrestamoAsync(7)).ReturnsAsync(prestamo);

        var (code, error) = await svc.DevolverAsync(7, "admin@e.com", 1);
        Assert.Equal(404, code);
    }
}
