using System.Data;
using GraphApi.Models.USR.CuartaMascotas;
using GraphApi.Repositories.USR;
using GraphApi.Services.USR.CuartaMascotas;
using Moq;
using Xunit;

namespace GraphApi.Tests;

public class CuartaMascotasServiceTests
{
    private static ICuartaMascotasService BuildService(
        out Mock<ICuartaMascotasRepository> repoMock,
        out Mock<IDbConnection> connMock)
    {
        repoMock = new Mock<ICuartaMascotasRepository>();
        connMock = new Mock<IDbConnection>();
        connMock.Setup(c => c.State).Returns(ConnectionState.Closed);
        var txMock = new Mock<IDbTransaction>();
        connMock.Setup(c => c.BeginTransaction()).Returns(txMock.Object);
        return new CuartaMascotasService(repoMock.Object, connMock.Object);
    }

    // ── Crear ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Crear_NombreVacio_Devuelve422()
    {
        var svc = BuildService(out _, out _);
        var req = new MascotaCrearRequest("", null, null, null, null, null, null);
        var (status, id, error) = await svc.CrearAsync(req, "u@e.com", 1);
        Assert.Equal(422, status);
        Assert.Null(id);
    }

    [Fact]
    public async Task Crear_Valido_Devuelve201YCommit()
    {
        var svc = BuildService(out var repo, out var conn);
        repo.Setup(r => r.InsertAsync(It.IsAny<MascotaCrearRequest>(), It.IsAny<string>(), It.IsAny<int>(), It.IsAny<IDbTransaction>()))
            .ReturnsAsync(99);
        var txMock = new Mock<IDbTransaction>();
        conn.Setup(c => c.BeginTransaction()).Returns(txMock.Object);

        var req = new MascotaCrearRequest("Fido", null, null, null, null, null, null);
        var (status, id, error) = await svc.CrearAsync(req, "u@e.com", 1);

        Assert.Equal(201, status);
        Assert.Equal(99, id);
        txMock.Verify(t => t.Commit(), Times.Once);
    }

    // ── Actualizar ─────────────────────────────────────────────────────────────

    [Fact]
    public async Task Actualizar_NoEsDuenio_Devuelve404()
    {
        var svc = BuildService(out var repo, out _);
        repo.Setup(r => r.ExisteMascotaAsync(5, 1)).ReturnsAsync(false);

        var req = new MascotaActualizarRequest("Rex", null, null, null, null, null, null);
        var (status, error) = await svc.ActualizarAsync(5, req, "u@e.com", 1);
        Assert.Equal(404, status);
    }

    [Fact]
    public async Task Actualizar_Valido_Devuelve204YCommit()
    {
        var svc = BuildService(out var repo, out var conn);
        repo.Setup(r => r.ExisteMascotaAsync(5, 1)).ReturnsAsync(true);
        repo.Setup(r => r.ActualizarAsync(5, It.IsAny<MascotaActualizarRequest>(), It.IsAny<string>(), It.IsAny<IDbTransaction>()))
            .ReturnsAsync(true);
        var txMock = new Mock<IDbTransaction>();
        conn.Setup(c => c.BeginTransaction()).Returns(txMock.Object);

        var req = new MascotaActualizarRequest("Rex", null, null, null, null, null, null);
        var (status, _) = await svc.ActualizarAsync(5, req, "u@e.com", 1);

        Assert.Equal(204, status);
        txMock.Verify(t => t.Commit(), Times.Once);
    }

    // ── Eliminar ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Eliminar_NoEsDuenio_Devuelve404()
    {
        var svc = BuildService(out var repo, out _);
        repo.Setup(r => r.ExisteMascotaAsync(3, 1)).ReturnsAsync(false);

        var (status, _) = await svc.EliminarAsync(3, "u@e.com", 1);
        Assert.Equal(404, status);
    }

    [Fact]
    public async Task Eliminar_Valido_Devuelve204YCommit()
    {
        var svc = BuildService(out var repo, out var conn);
        repo.Setup(r => r.ExisteMascotaAsync(3, 1)).ReturnsAsync(true);
        repo.Setup(r => r.SoftDeleteAsync(3, It.IsAny<string>(), It.IsAny<IDbTransaction>()))
            .ReturnsAsync(true);
        var txMock = new Mock<IDbTransaction>();
        conn.Setup(c => c.BeginTransaction()).Returns(txMock.Object);

        var (status, _) = await svc.EliminarAsync(3, "u@e.com", 1);

        Assert.Equal(204, status);
        txMock.Verify(t => t.Commit(), Times.Once);
    }
}
