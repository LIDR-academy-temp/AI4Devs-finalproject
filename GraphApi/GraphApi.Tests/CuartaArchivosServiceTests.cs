using GraphApi.Infrastructure;
using GraphApi.Infrastructure.Storage;
using GraphApi.Models.ARC.CuartaArchivos;
using GraphApi.Repositories.ARC;
using GraphApi.Services.ARC.CuartaArchivos;
using Microsoft.AspNetCore.Http;
using Moq;

namespace GraphApi.Tests;

public class CuartaArchivosServiceTests
{
    private static CuartaArchivosService BuildSut(
        Mock<ICuartaArchivosRepository>? repo = null,
        Mock<IFileStorage>? storage = null,
        Mock<IUnitOfWork>? uow = null)
    {
        repo ??= new Mock<ICuartaArchivosRepository>();
        storage ??= new Mock<IFileStorage>();
        uow ??= new Mock<IUnitOfWork>();
        return new CuartaArchivosService(repo.Object, storage.Object, uow.Object);
    }

    // ── SubirAsync ──────────────────────────────────────────────────────────

    [Fact]
    public async Task SubirAsync_archivo_mayor_5MB_devuelve_ARCHIVO_DEMASIADO_GRANDE()
    {
        var sut = BuildSut();
        var bigFile = MakeFile(6 * 1024 * 1024, "application/pdf");

        var (data, code, status, _) = await sut.SubirAsync(
            bigFile, new SubirArchivoRequest { Nombre = "x", TipoArchivo = "Reglamento" }, 1, "admin@test");

        Assert.Null(data);
        Assert.Equal("ARCHIVO_DEMASIADO_GRANDE", code);
        Assert.Equal(StatusCodes.Status413RequestEntityTooLarge, status);
    }

    [Fact]
    public async Task SubirAsync_tipo_mime_no_permitido_devuelve_TIPO_NO_PERMITIDO()
    {
        var sut = BuildSut();
        var badFile = MakeFile(100, "text/plain");

        var (data, code, status, _) = await sut.SubirAsync(
            badFile, new SubirArchivoRequest { Nombre = "x", TipoArchivo = "Reglamento" }, 1, "admin@test");

        Assert.Null(data);
        Assert.Equal("TIPO_NO_PERMITIDO", code);
        Assert.Equal(StatusCodes.Status415UnsupportedMediaType, status);
    }

    [Fact]
    public async Task SubirAsync_tipo_no_encontrado_devuelve_TIPO_NO_ENCONTRADO()
    {
        var repo = new Mock<ICuartaArchivosRepository>();

        var uow = new Mock<IUnitOfWork>();
        var tx = Mock.Of<System.Data.IDbTransaction>();
        uow.Setup(u => u.BeginTransaction()).Returns(tx);
        repo.Setup(r => r.ResolverTipoArchivoIdAsync("DesconocidoX", tx))
            .ReturnsAsync((int?)null);

        var sut = BuildSut(repo: repo, uow: uow);
        var file = MakeFile(100, "application/pdf");

        var (data, code, status, _) = await sut.SubirAsync(
            file, new SubirArchivoRequest { Nombre = "x", TipoArchivo = "DesconocidoX" }, 1, "admin@test");

        Assert.Null(data);
        Assert.Equal("TIPO_NO_ENCONTRADO", code);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, status);
    }

    // ── DescargarAsync ──────────────────────────────────────────────────────

    [Fact]
    public async Task DescargarAsync_archivo_no_existe_devuelve_404()
    {
        var repo = new Mock<ICuartaArchivosRepository>();
        repo.Setup(r => r.ObtenerAsync(99, default)).ReturnsAsync((ArchivoListItemDto?)null);

        var sut = BuildSut(repo: repo);

        var (stream, _, _, code, status, _) = await sut.DescargarAsync(99, 1, "u@t", null, null);

        Assert.Null(stream);
        Assert.Equal("ARCHIVO_NO_ENCONTRADO", code);
        Assert.Equal(StatusCodes.Status404NotFound, status);
    }

    [Fact]
    public async Task DescargarAsync_archivo_fisico_no_disponible_devuelve_404()
    {
        var dto = new ArchivoListItemDto { ArchivoId = 1, Nombre = "doc.pdf", Ruta = "abc.pdf" };
        var repo = new Mock<ICuartaArchivosRepository>();
        repo.Setup(r => r.ObtenerAsync(1, default)).ReturnsAsync(dto);

        var storage = new Mock<IFileStorage>();
        storage.Setup(s => s.GetAsync("abc.pdf", default))
            .ThrowsAsync(new FileNotFoundException("not found", "abc.pdf"));

        var sut = BuildSut(repo: repo, storage: storage);

        var (stream, _, _, code, status, _) = await sut.DescargarAsync(1, 1, "u@t", null, null);

        Assert.Null(stream);
        Assert.Equal("ARCHIVO_NO_DISPONIBLE", code);
        Assert.Equal(StatusCodes.Status404NotFound, status);
    }

    // ── EliminarAsync ───────────────────────────────────────────────────────

    [Fact]
    public async Task EliminarAsync_no_existe_devuelve_404()
    {
        var repo = new Mock<ICuartaArchivosRepository>();
        repo.Setup(r => r.ObtenerAsync(5, default)).ReturnsAsync((ArchivoListItemDto?)null);

        var sut = BuildSut(repo: repo);

        var (ok, code, status, _) = await sut.EliminarAsync(5, 1, "admin@test");

        Assert.False(ok);
        Assert.Equal("ARCHIVO_NO_ENCONTRADO", code);
        Assert.Equal(StatusCodes.Status404NotFound, status);
    }

    // ── Helpers ─────────────────────────────────────────────────────────────

    private static IFormFile MakeFile(long size, string contentType)
    {
        var bytes = new byte[size];
        var stream = new MemoryStream(bytes);
        var file = new Mock<IFormFile>();
        file.Setup(f => f.Length).Returns(size);
        file.Setup(f => f.ContentType).Returns(contentType);
        file.Setup(f => f.FileName).Returns("test.pdf");
        file.Setup(f => f.OpenReadStream()).Returns(stream);
        return file.Object;
    }
}
