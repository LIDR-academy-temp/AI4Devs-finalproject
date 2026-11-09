using GraphApi.Infrastructure;
using GraphApi.Models.SGR.Navegacion;
using GraphApi.Repositories.SGR;
using GraphApi.Services.SGR.Navegacion;
using Microsoft.AspNetCore.Http;
using Moq;

namespace GraphApi.Tests;

public class CuartaNavegacionServiceTests
{
    [Fact]
    public void MenuArbolBuilder_orden_y_jerarquia()
    {
        var filas = new List<MenuPerfilRow>
        {
            new() { MenuId = 1, TituloMenu = "Raiz", Orden = 2, PadreMenuId = null },
            new() { MenuId = 2, TituloMenu = "Hijo", Orden = 1, PadreMenuId = 1, Ruta = "/app" },
            new() { MenuId = 3, TituloMenu = "Otra raiz", Orden = 1, PadreMenuId = null },
        };

        var arbol = MenuArbolBuilder.Construir(filas);
        Assert.Equal(2, arbol.Count);
        Assert.Equal(3, arbol[0].MenuId);
        Assert.Single(arbol[1].Hijos);
        Assert.Equal("/app", arbol[1].Hijos[0].Ruta);
    }

    [Fact]
    public async Task ObtenerMenusUsuarioAsync_sin_perfil_422()
    {
        var sut = new CuartaNavegacionService(Mock.Of<ICuartaNavegacionRepository>(), Mock.Of<IUnitOfWork>());
        var (data, code, status, _) = await sut.ObtenerMenusUsuarioAsync(null);
        Assert.Null(data);
        Assert.Equal("PERFIL_NO_RESUELTO", code);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, status);
    }

    [Fact]
    public async Task ActualizarPermisosMenusAsync_menu_inexistente_422()
    {
        var repo = new Mock<ICuartaNavegacionRepository>();
        repo.Setup(r => r.PerfilExisteAsync(1, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        repo.Setup(r => r.ContarMenusExistentesAsync(It.IsAny<int[]>(), It.IsAny<System.Data.IDbTransaction>()))
            .ReturnsAsync(0);

        var tx = Mock.Of<System.Data.IDbTransaction>();
        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(tx);

        var sut = new CuartaNavegacionService(repo.Object, uow.Object);
        var (data, code, status, _) = await sut.ActualizarPermisosMenusAsync(
            1,
            new PerfilMenuAsignacionRequest
            {
                Menus = new[] { new PerfilMenuAsignacionItemRequest { MenuId = 99, Visible = true } }
            },
            1,
            "admin@local");

        Assert.Null(data);
        Assert.Equal("MENU_NO_ENCONTRADO", code);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, status);
    }

    [Fact]
    public async Task ActualizarMenuAsync_padre_igual_menu_422()
    {
        var repo = new Mock<ICuartaNavegacionRepository>();
        repo.Setup(r => r.MenuExisteAsync(5, It.IsAny<System.Data.IDbTransaction>())).ReturnsAsync(true);

        var tx = Mock.Of<System.Data.IDbTransaction>();
        var uow = new Mock<IUnitOfWork>();
        uow.Setup(u => u.BeginTransaction()).Returns(tx);

        var sut = new CuartaNavegacionService(repo.Object, uow.Object);
        var (data, code, status, _) = await sut.ActualizarMenuAsync(
            5,
            new MenuActualizarRequest { PadreMenuId = 5 },
            1,
            "admin@local");

        Assert.Null(data);
        Assert.Equal("MENU_PADRE_INVALIDO", code);
        Assert.Equal(StatusCodes.Status422UnprocessableEntity, status);
    }

    [Fact]
    public async Task ObtenerMenusUsuarioAsync_resuelve_arbol()
    {
        var repo = new Mock<ICuartaNavegacionRepository>();
        repo.Setup(r => r.ResolverPerfilIdAsync("Residente", It.IsAny<CancellationToken>())).ReturnsAsync(2);
        repo.Setup(r => r.ListarMenusPorPerfilAsync(2, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<MenuPerfilRow>
            {
                new() { MenuId = 10, TituloMenu = "Inicio", Orden = 1, Ruta = "/inicio" }
            });

        var sut = new CuartaNavegacionService(repo.Object, Mock.Of<IUnitOfWork>());
        var (data, code, status, _) = await sut.ObtenerMenusUsuarioAsync("Residente");
        Assert.NotNull(data);
        Assert.Null(code);
        Assert.Equal(StatusCodes.Status200OK, status);
        Assert.DoesNotContain(data, n => n.Ruta?.Contains("/admin") == true);
    }
}
