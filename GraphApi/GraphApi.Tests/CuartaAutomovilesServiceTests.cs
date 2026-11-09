using System.Data;
using GraphApi.Models.USR.CuartaAutomoviles;
using GraphApi.Repositories.USR;
using GraphApi.Services.USR.CuartaAutomoviles;
using Moq;
using Xunit;

namespace GraphApi.Tests;

public class CuartaAutomovilesServiceTests
{
    private readonly Mock<ICuartaAutomovilesRepository> _repoMock = new();
    private readonly Mock<IDbConnection> _dbMock = new();
    private readonly Mock<IDbTransaction> _txMock = new();
    private readonly CuartaAutomovilesService _sut;

    public CuartaAutomovilesServiceTests()
    {
        _dbMock.Setup(d => d.State).Returns(ConnectionState.Open);
        _dbMock.Setup(d => d.BeginTransaction()).Returns(_txMock.Object);
        _sut = new CuartaAutomovilesService(_repoMock.Object, _dbMock.Object);
    }

    [Fact]
    public async Task CrearAsync_PlacasVacias_Retorna422()
    {
        var req = new AutomovilCrearRequest { Placas = "" };
        var (auto, code, status, _) = await _sut.CrearAsync(req, "usr@test.com", 1);

        Assert.Null(auto);
        Assert.Equal("VEH_PLACAS_REQUERIDAS", code);
        Assert.Equal(422, status);
    }

    [Fact]
    public async Task CrearAsync_PlacasDuplicadas_Retorna409()
    {
        _repoMock.Setup(r => r.ExistePlacaAsync("ABC123", null, _txMock.Object))
                 .ReturnsAsync(true);

        var req = new AutomovilCrearRequest { Placas = "ABC123" };
        var (auto, code, status, _) = await _sut.CrearAsync(req, "usr@test.com", 1);

        Assert.Null(auto);
        Assert.Equal("VEH_PLACAS_DUPLICADAS", code);
        Assert.Equal(409, status);
    }

    [Fact]
    public async Task CrearAsync_Valido_InsertaYRetorna201()
    {
        _repoMock.Setup(r => r.ExistePlacaAsync("XYZ789", null, _txMock.Object))
                 .ReturnsAsync(false);
        _repoMock.Setup(r => r.InsertAsync(It.IsAny<AutomovilCrearRequest>(), "usr@test.com", 1, _txMock.Object))
                 .ReturnsAsync(42);
        _repoMock.Setup(r => r.ListarMisAsync(1, It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new List<AutomovilListItemDto>
                 {
                     new() { AutomovilId = 42, UsuarioId = 1, Placas = "XYZ789" }
                 });

        var req = new AutomovilCrearRequest { Placas = "XYZ789" };
        var (auto, code, status, _) = await _sut.CrearAsync(req, "usr@test.com", 1);

        Assert.NotNull(auto);
        Assert.Null(code);
        Assert.Equal(201, status);
        Assert.Equal(42, auto!.AutomovilId);
        _txMock.Verify(t => t.Commit(), Times.Once);
    }

    [Fact]
    public async Task ActualizarAsync_NoEsDuenio_Retorna404()
    {
        _repoMock.Setup(r => r.EsDuenioAsync(99, 1)).ReturnsAsync(false);

        var req = new AutomovilActualizarRequest { Color = "Rojo" };
        var (ok, code, status, _) = await _sut.ActualizarAsync(99, req, "usr@test.com", 1);

        Assert.False(ok);
        Assert.Equal("VEH_NOT_FOUND", code);
        Assert.Equal(404, status);
    }

    [Fact]
    public async Task EliminarAsync_NoEsDuenio_Retorna404()
    {
        _repoMock.Setup(r => r.EsDuenioAsync(5, 2)).ReturnsAsync(false);

        var (ok, code, status, _) = await _sut.EliminarAsync(5, "usr@test.com", 2);

        Assert.False(ok);
        Assert.Equal("VEH_NOT_FOUND", code);
        Assert.Equal(404, status);
    }

    [Fact]
    public async Task EliminarAsync_Valido_Retorna204()
    {
        _repoMock.Setup(r => r.EsDuenioAsync(5, 1)).ReturnsAsync(true);
        _repoMock.Setup(r => r.SoftDeleteAsync(5, "usr@test.com", _txMock.Object)).ReturnsAsync(true);

        var (ok, code, status, _) = await _sut.EliminarAsync(5, "usr@test.com", 1);

        Assert.True(ok);
        Assert.Null(code);
        Assert.Equal(204, status);
        _txMock.Verify(t => t.Commit(), Times.Once);
    }

    [Fact]
    public async Task CrearParaUsuarioAsync_UsuarioInvalido_Retorna422()
    {
        var req = new AutomovilCrearAdminRequest { UsuarioId = 0, Placas = "ABC" };
        var (auto, code, status, _) = await _sut.CrearParaUsuarioAsync(req, "admin@test.com", 99);

        Assert.Null(auto);
        Assert.Equal("VEH_USUARIO_INVALIDO", code);
        Assert.Equal(422, status);
    }

    [Fact]
    public async Task CrearParaUsuarioAsync_PlacasDuplicadas_Retorna409()
    {
        _repoMock.Setup(r => r.UsuarioActivoAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _repoMock.Setup(r => r.ExistePlacaAsync("DUP1", null, _txMock.Object)).ReturnsAsync(true);

        var req = new AutomovilCrearAdminRequest { UsuarioId = 5, Placas = "DUP1" };
        var (auto, code, status, _) = await _sut.CrearParaUsuarioAsync(req, "admin@test.com", 99);

        Assert.Null(auto);
        Assert.Equal("VEH_PLACAS_DUPLICADAS", code);
        Assert.Equal(409, status);
    }

    [Fact]
    public async Task CrearParaUsuarioAsync_Valido_Retorna201()
    {
        _repoMock.Setup(r => r.UsuarioActivoAsync(5, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _repoMock.Setup(r => r.ExistePlacaAsync("NEW1", null, _txMock.Object)).ReturnsAsync(false);
        _repoMock.Setup(r => r.InsertAsync(It.IsAny<AutomovilCrearRequest>(), "admin@test.com", 5, _txMock.Object))
                 .ReturnsAsync(77);
        _repoMock.Setup(r => r.ListarPadronAsync(It.IsAny<CancellationToken>()))
                 .ReturnsAsync(new List<AutomovilListItemDto>
                 {
                     new() { AutomovilId = 77, UsuarioId = 5, Placas = "NEW1" }
                 });

        var req = new AutomovilCrearAdminRequest { UsuarioId = 5, Placas = "NEW1" };
        var (auto, code, status, _) = await _sut.CrearParaUsuarioAsync(req, "admin@test.com", 99);

        Assert.NotNull(auto);
        Assert.Equal(201, status);
        Assert.Null(code);
        Assert.Equal(77, auto!.AutomovilId);
    }

    [Fact]
    public async Task ActualizarComoAdminAsync_Existe_Retorna204()
    {
        _repoMock.Setup(r => r.ExisteActivoAsync(10, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        _repoMock.Setup(r => r.ActualizarAsync(10, It.IsAny<AutomovilActualizarRequest>(), "admin@test.com", _txMock.Object))
                 .ReturnsAsync(true);

        var (ok, code, status, _) = await _sut.ActualizarComoAdminAsync(10, new AutomovilActualizarRequest { Color = "Azul" }, "admin@test.com");

        Assert.True(ok);
        Assert.Equal(204, status);
        Assert.Null(code);
    }
}
