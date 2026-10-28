using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Moq;
using Web.Controllers.Encuestas;
using Web.Models.Admin;
using Web.Services;
using Xunit;

namespace Web.Tests;

public sealed class EncuestasControllerTests
{
    // ── helpers ──────────────────────────────────────────────────────────────

    private static EncuestasController CreateController(Mock<IGraphApiBackendService> backend)
    {
        var controller = new EncuestasController(backend.Object);
        var httpContext = new DefaultHttpContext();
        var tempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        controller.ControllerContext = new ControllerContext { HttpContext = httpContext };
        controller.TempData = tempData;
        return controller;
    }

    private static IReadOnlyList<EncuestaFormViewModel> SampleEncuestas() =>
    [
        new EncuestaFormViewModel { EncuestaID = 1, Titulo = "Encuesta A", bActivo = true,  bEliminado = false },
        new EncuestaFormViewModel { EncuestaID = 2, Titulo = "Encuesta B", bActivo = false, bEliminado = false },
        new EncuestaFormViewModel { EncuestaID = 3, Titulo = "Eliminada",  bActivo = true,  bEliminado = true  }
    ];

    private static void SetupEmptyEncuestas(Mock<IGraphApiBackendService> backend)
    {
        backend.Setup(s => s.GetEncuestasAsync()).ReturnsAsync(Array.Empty<EncuestaFormViewModel>());
        backend.Setup(s => s.GetPreguntasAsync(It.IsAny<int>())).ReturnsAsync(Array.Empty<PreguntaFormViewModel>());
        backend.Setup(s => s.GetOpcionesAsync(It.IsAny<int>())).ReturnsAsync(Array.Empty<OpcionPreguntaFormViewModel>());
    }

    // ── Index ─────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Index_returns_all_non_deleted_encuestas()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.GetEncuestasAsync()).ReturnsAsync(SampleEncuestas());

        var controller = CreateController(backend);
        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<EncuestasPageViewModel>(view.Model);
        Assert.Equal(2, model.Items.Count);   // "Eliminada" filtered out
        Assert.Equal(1, model.TotalActivas);   // only "Encuesta A"
    }

    [Fact]
    public async Task Index_filters_to_active_only_when_soloActivas_is_true()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.GetEncuestasAsync()).ReturnsAsync(SampleEncuestas());

        var controller = CreateController(backend);
        var result = await controller.Index(soloActivas: true);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<EncuestasPageViewModel>(view.Model);
        Assert.Single(model.Items);
        Assert.Equal("Encuesta A", model.Items[0].Titulo);
    }

    [Fact]
    public async Task Index_sorts_active_encuestas_before_inactive()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.GetEncuestasAsync()).ReturnsAsync(SampleEncuestas());

        var controller = CreateController(backend);
        var result = await controller.Index();

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<EncuestasPageViewModel>(view.Model);
        Assert.True(model.Items[0].bActivo);    // active first
        Assert.False(model.Items[1].bActivo);   // inactive second
    }

    // ── Save ──────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Save_creates_encuesta_and_redirects_when_titulo_provided()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.SaveEncuestaAsync(It.IsAny<EncuestaFormViewModel>())).ReturnsAsync(true);

        var controller = CreateController(backend);
        var form = new EncuestaFormViewModel { Titulo = "Nueva Encuesta" };

        var result = await controller.Save(form);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        backend.Verify(s => s.SaveEncuestaAsync(It.IsAny<EncuestaFormViewModel>()), Times.Once);
        Assert.Equal("Encuesta creada.", controller.TempData["Message"]);
    }

    [Fact]
    public async Task Save_sets_actualizada_message_when_encuesta_has_id()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.SaveEncuestaAsync(It.IsAny<EncuestaFormViewModel>())).ReturnsAsync(true);

        var controller = CreateController(backend);
        var form = new EncuestaFormViewModel { EncuestaID = 5, Titulo = "Encuesta Existente" };

        await controller.Save(form);

        Assert.Equal("Encuesta actualizada.", controller.TempData["Message"]);
    }

    [Fact]
    public async Task Save_rejects_when_titulo_is_empty_and_does_not_call_service()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var form = new EncuestaFormViewModel { Titulo = "" };

        var result = await controller.Save(form);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        backend.Verify(s => s.SaveEncuestaAsync(It.IsAny<EncuestaFormViewModel>()), Times.Never);
        Assert.Equal("El título es obligatorio.", controller.TempData["Error"]);
    }

    // ── Delete ────────────────────────────────────────────────────────────────

    [Fact]
    public async Task Delete_calls_service_and_redirects()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.DeleteEncuestaAsync(3)).ReturnsAsync(true);

        var controller = CreateController(backend);
        var result = await controller.Delete(encuestaId: 3);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
        backend.Verify(s => s.DeleteEncuestaAsync(3), Times.Once);
        Assert.Equal("Encuesta eliminada.", controller.TempData["Message"]);
    }

    // ── Detalle ───────────────────────────────────────────────────────────────

    [Fact]
    public async Task Detalle_returns_view_when_encuesta_exists()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.GetEncuestasAsync()).ReturnsAsync(SampleEncuestas());
        backend.Setup(s => s.GetPreguntasAsync(It.IsAny<int>())).ReturnsAsync(new[]
        {
            new PreguntaFormViewModel { PreguntaID = 10, EncuestaID = 1, Texto = "¿Pregunta 1?", bEliminado = false }
        });
        backend.Setup(s => s.GetOpcionesAsync(It.IsAny<int>())).ReturnsAsync(new[]
        {
            new OpcionPreguntaFormViewModel { OpcionPreguntaID = 100, PreguntaID = 10, Texto = "Sí", bEliminado = false }
        });

        var controller = CreateController(backend);
        var result = await controller.Detalle(encuestaId: 1);

        var view = Assert.IsType<ViewResult>(result);
        var model = Assert.IsType<EncuestaDetallePageViewModel>(view.Model);
        Assert.Equal(1, model.Encuesta.EncuestaID);
        Assert.Single(model.Preguntas);
        Assert.Single(model.Opciones);
    }

    [Fact]
    public async Task Detalle_redirects_to_index_when_encuesta_not_found()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        SetupEmptyEncuestas(backend);

        var controller = CreateController(backend);
        var result = await controller.Detalle(encuestaId: 999);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Index", redirect.ActionName);
    }

    // ── SavePregunta ──────────────────────────────────────────────────────────

    [Fact]
    public async Task SavePregunta_creates_and_redirects_to_detalle()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.SavePreguntaAsync(It.IsAny<PreguntaFormViewModel>())).ReturnsAsync(true);

        var controller = CreateController(backend);
        var form = new PreguntaFormViewModel { EncuestaID = 1, Texto = "¿Nueva?" };

        var result = await controller.SavePregunta(form);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Detalle", redirect.ActionName);
        Assert.Equal(1, redirect.RouteValues!["encuestaId"]);
        backend.Verify(s => s.SavePreguntaAsync(It.IsAny<PreguntaFormViewModel>()), Times.Once);
    }

    [Fact]
    public async Task SavePregunta_rejects_when_texto_empty()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var form = new PreguntaFormViewModel { EncuestaID = 1, Texto = "" };

        await controller.SavePregunta(form);

        backend.Verify(s => s.SavePreguntaAsync(It.IsAny<PreguntaFormViewModel>()), Times.Never);
        Assert.Equal("Texto y encuesta son obligatorios.", controller.TempData["Error"]);
    }

    [Fact]
    public async Task SavePregunta_rejects_when_encuestaId_is_null()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var form = new PreguntaFormViewModel { EncuestaID = null, Texto = "¿Texto?" };

        await controller.SavePregunta(form);

        backend.Verify(s => s.SavePreguntaAsync(It.IsAny<PreguntaFormViewModel>()), Times.Never);
        Assert.Equal("Texto y encuesta son obligatorios.", controller.TempData["Error"]);
    }

    // ── DeletePregunta ────────────────────────────────────────────────────────

    [Fact]
    public async Task DeletePregunta_calls_service_and_redirects_to_detalle()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.DeletePreguntaAsync(10)).ReturnsAsync(true);

        var controller = CreateController(backend);
        var result = await controller.DeletePregunta(preguntaId: 10, encuestaId: 1);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Detalle", redirect.ActionName);
        Assert.Equal(1, redirect.RouteValues!["encuestaId"]);
        backend.Verify(s => s.DeletePreguntaAsync(10), Times.Once);
    }

    // ── SaveOpcion ────────────────────────────────────────────────────────────

    [Fact]
    public async Task SaveOpcion_creates_and_redirects_to_detalle()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.SaveOpcionAsync(It.IsAny<OpcionPreguntaFormViewModel>())).ReturnsAsync(true);

        var controller = CreateController(backend);
        var form = new OpcionPreguntaFormViewModel { PreguntaID = 10, Texto = "Sí" };

        var result = await controller.SaveOpcion(form, encuestaId: 1);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Detalle", redirect.ActionName);
        Assert.Equal(1, redirect.RouteValues!["encuestaId"]);
        backend.Verify(s => s.SaveOpcionAsync(It.IsAny<OpcionPreguntaFormViewModel>()), Times.Once);
    }

    [Fact]
    public async Task SaveOpcion_rejects_when_texto_empty()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var form = new OpcionPreguntaFormViewModel { PreguntaID = 10, Texto = "" };

        await controller.SaveOpcion(form, encuestaId: 1);

        backend.Verify(s => s.SaveOpcionAsync(It.IsAny<OpcionPreguntaFormViewModel>()), Times.Never);
        Assert.Equal("Texto y pregunta son obligatorios.", controller.TempData["Error"]);
    }

    [Fact]
    public async Task SaveOpcion_rejects_when_preguntaId_is_null()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        var controller = CreateController(backend);
        var form = new OpcionPreguntaFormViewModel { PreguntaID = null, Texto = "Respuesta" };

        await controller.SaveOpcion(form, encuestaId: 1);

        backend.Verify(s => s.SaveOpcionAsync(It.IsAny<OpcionPreguntaFormViewModel>()), Times.Never);
        Assert.Equal("Texto y pregunta son obligatorios.", controller.TempData["Error"]);
    }

    // ── DeleteOpcion ──────────────────────────────────────────────────────────

    [Fact]
    public async Task DeleteOpcion_calls_service_and_redirects_to_detalle()
    {
        var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
        backend.Setup(s => s.DeleteOpcionAsync(100)).ReturnsAsync(true);

        var controller = CreateController(backend);
        var result = await controller.DeleteOpcion(opcionId: 100, encuestaId: 1);

        var redirect = Assert.IsType<RedirectToActionResult>(result);
        Assert.Equal("Detalle", redirect.ActionName);
        Assert.Equal(1, redirect.RouteValues!["encuestaId"]);
        backend.Verify(s => s.DeleteOpcionAsync(100), Times.Once);
    }
}
