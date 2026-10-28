using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using System.Security.Claims;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;
using Xunit;
using ResidentDocumentosController = Web.Controllers.Residente.DocumentosController;
using ResidentEncuestasController = Web.Controllers.Residente.EncuestasController;
using ResidentNotificacionesController = Web.Controllers.Residente.NotificacionesController;

namespace Web.Tests;

public sealed class ResidentContentControllerTests
{
    private static ClaimsPrincipal CreateUser(int usuarioId = 25, bool isAdmin = false)
    {
        var claims = new List<Claim>
        {
            new(CotoContext.UsuarioIdClaim, usuarioId.ToString()),
            new(CotoContext.EsAdminClaim, isAdmin ? "true" : "false")
        };

        return new ClaimsPrincipal(new ClaimsIdentity(claims, "Test"));
    }

    private static ResidentPortalContextViewModel BuildActiveContext()
    {
        return new ResidentPortalContextViewModel
        {
            UsuarioId = 25,
            IsResident = true,
            Properties = new[]
            {
                new ResidentPropertyOptionViewModel
                {
                    CondominioId = 1,
                    CondominioName = "Cuarta Quinientos",
                    CasaId = 8,
                    CasaLabel = "Casa 8"
                }
            },
            SelectedCondominioId = 1,
            SelectedCondominioName = "Cuarta Quinientos",
            SelectedCasaId = 8,
            SelectedCasaLabel = "Casa 8"
        };
    }

    private static T ConfigureController<T>(T controller, ClaimsPrincipal? user = null) where T : Controller
    {
        var httpContext = new DefaultHttpContext
        {
            User = user ?? CreateUser()
        };

        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        return controller;
    }

    private static ResidentDocumentosController CreateDocumentosController(
        Mock<IGraphApiBackendService> backend,
        Mock<IResidentPortalService> residentPortal)
    {
        residentPortal.Setup(service => service.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(BuildActiveContext());

        return ConfigureController(new ResidentDocumentosController(backend.Object, residentPortal.Object));
    }

    private static ResidentNotificacionesController CreateNotificacionesController(
        Mock<IGraphApiBackendService> backend,
        Mock<IResidentPortalService> residentPortal)
    {
        residentPortal.Setup(service => service.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(BuildActiveContext());

        return ConfigureController(new ResidentNotificacionesController(backend.Object, residentPortal.Object));
    }

    private static ResidentEncuestasController CreateEncuestasController(
        Mock<IGraphApiBackendService> backend,
        Mock<IResidentPortalService> residentPortal)
    {
        residentPortal.Setup(service => service.GetContextAsync(It.IsAny<ClaimsPrincipal>()))
            .ReturnsAsync(BuildActiveContext());

        return ConfigureController(new ResidentEncuestasController(backend.Object, residentPortal.Object));
    }

    [Fact]
    public async Task Documentos_index_filters_to_public_documents_matching_search()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(service => service.GetAllArchivosAsync()).ReturnsAsync(new[]
        {
            new ArchivoFormViewModel { ArchivoID = 1, Nombre = "Reglamento 2026", TipoArchivo = "Reglamento", EsPrivado = false, bEliminado = false },
            new ArchivoFormViewModel { ArchivoID = 2, Nombre = "Acta privada", TipoArchivo = "Acta", EsPrivado = true, bEliminado = false },
            new ArchivoFormViewModel { ArchivoID = 3, Nombre = "Manual piscina", TipoArchivo = "Guía", EsPrivado = false, bEliminado = false }
        });

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateDocumentosController(backend, residentPortal);

        var result = await controller.Index(search: "regla");

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ResidentDocumentListPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Equal(1, model.Items[0].ArchivoID);
        Assert.DoesNotContain(model.Items, item => item.EsPrivado);
    }

    [Fact]
    public async Task Notificaciones_detail_marks_personal_notification_as_read()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(service => service.GetNotificacionesAsync()).ReturnsAsync(new[]
        {
            new NotificacionFormViewModel
            {
                NotificacionID = 7,
                UsuarioID = 25,
                Titulo = "Pago pendiente",
                Mensaje = "Recuerda revisar tu próximo vencimiento.",
                Leido = false,
                FechaCreacionNotificacion = new DateTime(2026, 4, 20),
                bEliminado = false
            }
        });
        backend.Setup(service => service.SaveNotificacionAsync(It.Is<NotificacionFormViewModel>(item => item.NotificacionID == 7 && item.Leido)))
            .ReturnsAsync(true);

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateNotificacionesController(backend, residentPortal);

        var result = await controller.Detail(7);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ResidentNotificationDetailViewModel>(view.Model);
        Assert.True(model.Notification.Leido);
        Assert.True(model.MarkedAsRead);
        backend.Verify(service => service.SaveNotificacionAsync(It.Is<NotificacionFormViewModel>(item => item.NotificacionID == 7 && item.Leido)), Times.Once);
    }

    [Fact]
    public async Task Encuestas_index_returns_only_active_surveys_and_pending_count()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(service => service.GetEncuestasAsync()).ReturnsAsync(new[]
        {
            new EncuestaFormViewModel { EncuestaID = 1, Titulo = "Uso del gimnasio", bActivo = true, bEliminado = false },
            new EncuestaFormViewModel { EncuestaID = 2, Titulo = "Nueva caseta", bActivo = true, bEliminado = false },
            new EncuestaFormViewModel { EncuestaID = 3, Titulo = "Histórica", bActivo = false, bEliminado = false },
            new EncuestaFormViewModel { EncuestaID = 4, Titulo = "Eliminada", bActivo = true, bEliminado = true }
        });
        backend.Setup(service => service.EncuestaYaRespondidaAsync(1, 25)).ReturnsAsync(false);
        backend.Setup(service => service.EncuestaYaRespondidaAsync(2, 25)).ReturnsAsync(true);

        var residentPortal = new Mock<IResidentPortalService>(MockBehavior.Loose);
        var controller = CreateEncuestasController(backend, residentPortal);

        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<ResidentSurveyListPageViewModel>(view.Model);
        Assert.Equal(2, model.Items.Count);
        Assert.Equal(1, model.PendingCount);
        Assert.Contains(model.Items, item => item.Encuesta.Titulo == "Uso del gimnasio" && !item.YaRespondio);
        Assert.Contains(model.Items, item => item.Encuesta.Titulo == "Nueva caseta" && item.YaRespondio);
    }
}