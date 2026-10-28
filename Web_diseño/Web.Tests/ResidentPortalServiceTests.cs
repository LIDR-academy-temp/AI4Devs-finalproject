using Microsoft.Extensions.Caching.Memory;
using Moq;
using System.Security.Claims;
using Web.Models.Admin;
using Web.Services;
using Xunit;

namespace Web.Tests;

public sealed class ResidentPortalServiceTests
{
    private static ClaimsPrincipal CreateUser(int usuarioId = 25)
    {
        var claims = new List<Claim>
        {
            new(CotoContext.UsuarioIdClaim, usuarioId.ToString()),
            new(CotoContext.EsAdminClaim, "false"),
            new(ClaimTypes.Name, "juan@test.com")
        };

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    [Fact]
    public async Task BuildMenuAsync_preserves_permission_menus_for_resident_users_with_active_property()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(service => service.GetCasasAsync()).ReturnsAsync(new[]
        {
            new CasaFormViewModel
            {
                CasaID = 8,
                CondominioID = 1,
                DireccionCasa = "Casa 8",
                NumeroExtCasa = "8",
                PropietarioUsuarioID = 25,
                bEliminado = false
            }
        });
        backend.Setup(service => service.GetCondominiosAsync()).ReturnsAsync(new[]
        {
            new CondominioFormViewModel
            {
                CondominioID = 1,
                NombreCondominio = "Cuarta Quinientos",
                DireccionCondominio = "Direccion",
                bEliminado = false
            }
        });
        backend.Setup(service => service.GetNotificacionesAsync()).ReturnsAsync(Array.Empty<NotificacionFormViewModel>());
        backend.Setup(service => service.GetTicketsAsync()).ReturnsAsync(Array.Empty<TicketBoardItemViewModel>());
        backend.Setup(service => service.GetTicketsUsuariosAsignadosAsync()).ReturnsAsync(Array.Empty<TicketBoardAssignmentViewModel>());
        backend.Setup(service => service.GetCuotasAsync()).ReturnsAsync(Array.Empty<CuotaFormViewModel>());

        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = new ResidentPortalService(backend.Object, cache);
        var permissionMenus = new[]
        {
            new PerfilMenuItemViewModel
            {
                MenuID = 10,
                TituloMenu = "Operaciones",
                Ruta = "Gestion/Operaciones",
                bVisible = true,
                Orden = 1
            }
        };

        var result = await service.BuildMenuAsync(CreateUser(), permissionMenus);

        Assert.NotNull(result.ResidentContext);
        Assert.True(result.ResidentContext!.IsResident);
        Assert.Single(result.PermissionMenus);
        Assert.Equal("Gestion/Operaciones", result.PermissionMenus[0].Ruta);
    }

    [Fact]
    public async Task GetContextAsync_returns_missing_property_state_when_user_has_no_assigned_properties()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(service => service.GetCasasAsync()).ReturnsAsync(Array.Empty<CasaFormViewModel>());
        backend.Setup(service => service.GetCondominiosAsync()).ReturnsAsync(new[]
        {
            new CondominioFormViewModel
            {
                CondominioID = 1,
                NombreCondominio = "Cuarta Quinientos",
                DireccionCondominio = "Direccion",
                bEliminado = false
            }
        });

        using var cache = new MemoryCache(new MemoryCacheOptions());
        var service = new ResidentPortalService(backend.Object, cache);

        var result = await service.GetContextAsync(CreateUser());

        Assert.False(result.IsResident);
        Assert.False(result.HasAssignedProperties);
        Assert.False(result.HasActiveProperty);
        Assert.False(result.RequiresPropertySelection);
        Assert.Equal("Sin vivienda vinculada", result.StatusTitle);
        Assert.Equal(
            "Tu usuario no tiene una casa asignada como propietario. Solicita a administración que vincule tu vivienda para habilitar el portal residente.",
            result.StatusMessage);
    }
}