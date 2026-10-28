using System.Reflection;
using Microsoft.AspNetCore.Authorization;
using Web.Controllers.Admin;
using Web.Controllers.Catalogos;
using Web.Controllers.Finanzas;
using Web.Filters;
using Xunit;

namespace Web.Tests;

public sealed class ProtectedSurfaceTests
{
    public static TheoryData<Type, string> ProtectedControllers => new()
    {
        { typeof(TicketsController), "Gestion/Tickets" },
        { typeof(ReservasAmenidadesController), "Gestion/Reservas-Amenidades" },
        { typeof(PaseQrController), "Gestion/Pase-QR" },
        { typeof(VisitasController), "Gestion/Visitas" },
        { typeof(CuotasFinController), "Finanzas/Cuotas" },
        { typeof(CuentasFinController), "Finanzas/Cuentas" },
        { typeof(TransaccionesFinController), "Finanzas/Transacciones" },
        { typeof(ResidentesAdminController), "Admin/Residentes" },
        { typeof(MenusAdminController), "Admin/Menus" },
        { typeof(PerfilPermisosController), "Admin/Permisos" }
    };

    [Theory]
    [MemberData(nameof(ProtectedControllers))]
    public void Critical_controllers_keep_authorize_and_menu_access_guards(Type controllerType, string expectedRoute)
    {
        var authorize = controllerType.GetCustomAttribute<AuthorizeAttribute>();
        Assert.NotNull(authorize);

        var menuAccessData = controllerType
            .GetCustomAttributesData()
            .SingleOrDefault(data => data.AttributeType == typeof(RequireMenuAccessAttribute));

        Assert.NotNull(menuAccessData);
        Assert.Equal(expectedRoute, menuAccessData!.ConstructorArguments[0].Value);
    }
}