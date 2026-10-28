using System.Data;
using GraphApi.Models.JNT.CuartaJuntas;
using GraphApi.Repositories.JNT;
using GraphApi.Services.JNT.CuartaJuntas;
using Moq;
using Xunit;

namespace GraphApi.Tests;

public class CuartaJuntasServiceTests
{
    private readonly Mock<ICuartaJuntasRepository> _repoMock = new();
    private readonly Mock<IDbConnection> _dbMock = new();
    private readonly Mock<IDbTransaction> _txMock = new();
    private readonly CuartaJuntasService _sut;

    public CuartaJuntasServiceTests()
    {
        _dbMock.Setup(d => d.State).Returns(ConnectionState.Open);
        _dbMock.Setup(d => d.BeginTransaction()).Returns(_txMock.Object);
        _sut = new CuartaJuntasService(_repoMock.Object, _dbMock.Object);
    }

    [Fact]
    public async Task CrearAsync_TituloVacio_Retorna422()
    {
        var req = new JuntaCrearRequest { Titulo = "", FechaProgramada = DateTime.Today };
        var (junta, code, status, _) = await _sut.CrearAsync(req, "admin@test.com", 1);

        Assert.Null(junta);
        Assert.Equal(422, status);
        Assert.Equal("JNT_TITULO_REQUERIDO", code);
    }

    [Fact]
    public async Task CrearAsync_FechaDefault_Retorna422()
    {
        var req = new JuntaCrearRequest { Titulo = "Junta X", FechaProgramada = default };
        var (junta, code, status, _) = await _sut.CrearAsync(req, "admin@test.com", 1);

        Assert.Null(junta);
        Assert.Equal(422, status);
        Assert.Equal("JNT_FECHA_REQUERIDA", code);
    }

    [Fact]
    public async Task CrearAsync_Valido_CreaJuntaYDetalle()
    {
        var req = new JuntaCrearRequest
        {
            Titulo = "Junta ordinaria",
            FechaProgramada = DateTime.Today.AddDays(7),
            Contenido = "Orden del día...",
        };
        _repoMock.Setup(r => r.InsertJuntaAsync(req, It.IsAny<string>(), It.IsAny<int>(), _txMock.Object))
                 .ReturnsAsync(42);
        _repoMock.Setup(r => r.InsertDetalleAsync(42, req.Contenido, It.IsAny<string>(), It.IsAny<int>(), _txMock.Object))
                 .Returns(Task.CompletedTask);
        var detalle = new JuntaDetalleDto { JuntaId = 42, Titulo = req.Titulo };
        _repoMock.Setup(r => r.ObtenerAsync(42, default)).ReturnsAsync(detalle);

        var (junta, code, status, _) = await _sut.CrearAsync(req, "admin@test.com", 1);

        Assert.NotNull(junta);
        Assert.Equal(201, status);
        Assert.Null(code);
        _txMock.Verify(t => t.Commit(), Times.Once);
    }

    [Fact]
    public async Task ActualizarAsync_NotFound_Retorna404()
    {
        _repoMock.Setup(r => r.ActualizarAsync(99, It.IsAny<JuntaActualizarRequest>(), It.IsAny<string>(), It.IsAny<int>(), _txMock.Object))
                 .ReturnsAsync(false);

        var (ok, code, status, _) = await _sut.ActualizarAsync(99, new JuntaActualizarRequest(), "admin@test.com", 1);

        Assert.False(ok);
        Assert.Equal(404, status);
        Assert.Equal("JNT_NOT_FOUND", code);
    }

    [Fact]
    public async Task EliminarAsync_NotFound_Retorna404()
    {
        _repoMock.Setup(r => r.SoftDeleteAsync(99, It.IsAny<string>(), It.IsAny<int>(), _txMock.Object))
                 .ReturnsAsync(false);

        var (ok, code, status, _) = await _sut.EliminarAsync(99, "admin@test.com", 1);

        Assert.False(ok);
        Assert.Equal(404, status);
        Assert.Equal("JNT_NOT_FOUND", code);
    }
}
