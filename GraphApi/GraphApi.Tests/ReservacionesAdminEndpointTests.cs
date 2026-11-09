using FluentValidation;
using GraphApi.Controllers.VTS.ReservacionesArea;
using GraphApi.Models.TKT;
using GraphApi.Models.VTS.CuartaVisitas;
using GraphApi.Models.VTS.Validators;
using GraphApi.Services.VTS.CuartaVisitas;
using GraphApi.Services.VTS.ReservacionesArea;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Moq;

namespace GraphApi.Tests;

public class ReservacionesAdminEndpointTests
{
    private static ReservacionesAreaController CreateController(
        ICuartaVisitasService? cuarta = null,
        IValidator<ReservacionAdminFiltroDto>? validator = null)
    {
        return new ReservacionesAreaController(
            cuarta ?? Mock.Of<ICuartaVisitasService>(),
            Mock.Of<IReservacionesAreaService>(),
            validator ?? new ReservacionAdminFiltroDtoValidator());
    }

    [Fact]
    public async Task GetAdmin_reservaciones_returns_200_with_page()
    {
        var cuarta = new Mock<ICuartaVisitasService>();
        cuarta.Setup(s => s.ListarReservacionesAdminAsync(
                It.Is<ReservacionAdminFiltroDto>(f => f.Pagina == 1 && f.Tamano == 20),
                It.IsAny<CancellationToken>()))
            .ReturnsAsync(new PaginaDto<ReservacionAdminItemDto>
            {
                Pagina = 1,
                Total = 1,
                Items =
                [
                    new ReservacionAdminItemDto
                    {
                        ReservacionAreaId = 5,
                        AreaComun = "Salón",
                        UsuarioNombre = "Ana",
                    },
                ],
            });

        var controller = CreateController(cuarta.Object);
        var result = await controller.Admin(null, null, null, 1, 20, CancellationToken.None);

        var ok = Assert.IsType<OkObjectResult>(result);
        var page = Assert.IsType<PaginaDto<ReservacionAdminItemDto>>(ok.Value);
        Assert.Single(page.Items);
        cuarta.Verify(
            s => s.ListarReservacionesAdminAsync(It.IsAny<ReservacionAdminFiltroDto>(), It.IsAny<CancellationToken>()),
            Times.Once);
    }

    [Fact]
    public async Task GetAdmin_reservaciones_invalid_pagina_returns_400()
    {
        var controller = CreateController();
        var result = await controller.Admin(null, null, null, 0, 20, CancellationToken.None);

        var problem = Assert.IsType<ObjectResult>(result);
        Assert.Equal(StatusCodes.Status400BadRequest, problem.StatusCode);
    }
}
