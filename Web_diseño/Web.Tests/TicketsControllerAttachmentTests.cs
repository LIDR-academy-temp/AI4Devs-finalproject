using System.Text;
using Microsoft.AspNetCore.Hosting;
using Microsoft.AspNetCore.Http;
using Microsoft.AspNetCore.Mvc;
using Microsoft.AspNetCore.Mvc.ViewFeatures;
using Microsoft.AspNetCore.Routing;
using Moq;
using Web.Controllers.Catalogos;
using Web.Models.Admin;
using Web.Services;
using Xunit;

namespace Web.Tests;

public sealed class TicketsControllerAttachmentTests
{
    [Fact]
    public async Task Adjuntar_returns_redirect_and_saves_attachment_when_file_is_valid()
    {
        var tempRoot = CreateTempDirectory();
        try
        {
            var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
            var controller = CreateController(backend, tempRoot);
            var fileBytes = Encoding.UTF8.GetBytes("attachment-content");
            var file = CreateFormFile("evidencia.pdf", fileBytes);
            var filter = new TicketBoardFilterViewModel
            {
                Search = "agua",
                SoloAbiertos = true
            };

            backend.Setup(service => service.SaveArchivoAsync(
                    "evidencia.pdf",
                    It.Is<string>(path => path.StartsWith("uploads/tickets/42/") && path.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)),
                    null,
                    false,
                    false))
                .ReturnsAsync(123);

            backend.Setup(service => service.SaveTicketDocumentoAsync(42, 123, false))
                .ReturnsAsync(456);

            var result = await controller.Adjuntar(
                new TicketBoardAttachmentFormViewModel
                {
                    TicketID = 42,
                    Archivo = file,
                    bEliminado = false
                },
                filter,
                false,
                "detail");

            var redirect = Assert.IsType<RedirectToActionResult>(result);
            Assert.Equal("Index", redirect.ActionName);
            var routeValues = Assert.IsType<RouteValueDictionary>(redirect.RouteValues);
            var ticketId = Assert.IsType<int>(routeValues["ticketId"]!);
            Assert.Equal(42, ticketId);
            var focus = Assert.IsType<string>(routeValues["focus"]!);
            var search = Assert.IsType<string>(routeValues["search"]!);
            Assert.Equal("detail", focus);
            Assert.Equal("agua", search);
            Assert.Equal(true, routeValues["soloAbiertos"]);

            backend.Verify(service => service.SaveArchivoAsync(
                    "evidencia.pdf",
                    It.Is<string>(path => path.StartsWith("uploads/tickets/42/") && path.EndsWith(".pdf", StringComparison.OrdinalIgnoreCase)),
                    null,
                    false,
                    false),
                Times.Once);
            backend.Verify(service => service.SaveTicketDocumentoAsync(42, 123, false), Times.Once);

            var ticketFolder = Path.Combine(tempRoot, "uploads", "tickets", "42");
            var savedFiles = Directory.GetFiles(ticketFolder);
            Assert.Single(savedFiles);
            Assert.Equal(fileBytes, await File.ReadAllBytesAsync(savedFiles[0]));
        }
        finally
        {
            DeleteDirectory(tempRoot);
        }
    }

    [Fact]
    public async Task Adjuntar_rejects_unsupported_extension_without_calling_backend_save_methods()
    {
        var tempRoot = CreateTempDirectory();
        try
        {
            var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
            SetupEmptyBoard(backend);
            var controller = CreateController(backend, tempRoot);
            var file = CreateFormFile("nota.txt", Encoding.UTF8.GetBytes("texto"));

            var result = await controller.Adjuntar(
                new TicketBoardAttachmentFormViewModel
                {
                    TicketID = 42,
                    Archivo = file,
                    bEliminado = false
                },
                new TicketBoardFilterViewModel(),
                false,
                null);

            var view = Assert.IsType<ViewResult>(result);
            var model = Assert.IsType<TicketBoardPageViewModel>(view.Model);
            Assert.Equal("Tipo de archivo no permitido.", model.Error);

            backend.Verify(service => service.SaveArchivoAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<bool>(),
                    It.IsAny<bool>()),
                Times.Never);
            backend.Verify(service => service.SaveTicketDocumentoAsync(
                    It.IsAny<int>(),
                    It.IsAny<int>(),
                    It.IsAny<bool>()),
                Times.Never);
        }
        finally
        {
            DeleteDirectory(tempRoot);
        }
    }

    [Fact]
    public async Task Adjuntar_rejects_files_larger_than_limit_and_does_not_save_them()
    {
        var tempRoot = CreateTempDirectory();
        try
        {
            var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
            SetupEmptyBoard(backend);
            var controller = CreateController(backend, tempRoot);
            var oversizedBytes = new byte[(20 * 1024 * 1024) + 1];
            var file = CreateFormFile("foto.jpg", oversizedBytes);

            var result = await controller.Adjuntar(
                new TicketBoardAttachmentFormViewModel
                {
                    TicketID = 42,
                    Archivo = file,
                    bEliminado = false
                },
                new TicketBoardFilterViewModel(),
                false,
                null);

            var view = Assert.IsType<ViewResult>(result);
            var model = Assert.IsType<TicketBoardPageViewModel>(view.Model);
            Assert.Equal("El archivo excede el límite de 20 MB.", model.Error);

            backend.Verify(service => service.SaveArchivoAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<bool>(),
                    It.IsAny<bool>()),
                Times.Never);
            backend.Verify(service => service.SaveTicketDocumentoAsync(
                    It.IsAny<int>(),
                    It.IsAny<int>(),
                    It.IsAny<bool>()),
                Times.Never);
        }
        finally
        {
            DeleteDirectory(tempRoot);
        }
    }

    [Fact]
    public async Task Adjuntar_cleans_local_file_when_archive_registration_fails()
    {
        var tempRoot = CreateTempDirectory();
        try
        {
            var backend = new Mock<IGraphApiBackendService>(MockBehavior.Loose);
            SetupEmptyBoard(backend);
            backend.Setup(service => service.SaveArchivoAsync(
                    It.IsAny<string>(),
                    It.IsAny<string>(),
                    It.IsAny<int?>(),
                    It.IsAny<bool>(),
                    It.IsAny<bool>()))
                .ReturnsAsync((int?)null);

            var controller = CreateController(backend, tempRoot);
            var fileBytes = Encoding.UTF8.GetBytes("attachment-content");
            var file = CreateFormFile("evidencia.pdf", fileBytes);

            var result = await controller.Adjuntar(
                new TicketBoardAttachmentFormViewModel
                {
                    TicketID = 42,
                    Archivo = file,
                    bEliminado = false
                },
                new TicketBoardFilterViewModel(),
                false,
                null);

            var view = Assert.IsType<ViewResult>(result);
            var model = Assert.IsType<TicketBoardPageViewModel>(view.Model);
            Assert.Equal("No se pudo registrar el archivo adjunto.", model.Error);

            var ticketFolder = Path.Combine(tempRoot, "uploads", "tickets", "42");
            Assert.True(Directory.Exists(ticketFolder));
            Assert.Empty(Directory.GetFiles(ticketFolder));
            backend.Verify(service => service.DeleteArchivoAsync(It.IsAny<int>()), Times.Never);
            backend.Verify(service => service.SaveTicketDocumentoAsync(It.IsAny<int>(), It.IsAny<int>(), It.IsAny<bool>()), Times.Never);
        }
        finally
        {
            DeleteDirectory(tempRoot);
        }
    }

    private static TicketsController CreateController(Mock<IGraphApiBackendService> backend, string webRootPath)
    {
        var environment = new Mock<IWebHostEnvironment>(MockBehavior.Loose);
        environment.SetupGet(item => item.WebRootPath).Returns(webRootPath);

        var controller = new TicketsController(backend.Object, environment.Object);
        var httpContext = new DefaultHttpContext();
        controller.ControllerContext = new ControllerContext
        {
            HttpContext = httpContext
        };
        controller.TempData = new TempDataDictionary(httpContext, Mock.Of<ITempDataProvider>());
        return controller;
    }

    private static void SetupEmptyBoard(Mock<IGraphApiBackendService> backend)
    {
        backend.Setup(service => service.GetTicketsAsync()).ReturnsAsync(Array.Empty<TicketBoardItemViewModel>());
        backend.Setup(service => service.GetEstadosTicketsAsync()).ReturnsAsync(Array.Empty<TicketBoardStateLookupViewModel>());
        backend.Setup(service => service.GetPrioridadTicketsAsync()).ReturnsAsync(Array.Empty<TicketBoardPriorityLookupViewModel>());
        backend.Setup(service => service.GetComentariosTicketsAsync()).ReturnsAsync(Array.Empty<TicketBoardCommentViewModel>());
        backend.Setup(service => service.GetTicketsUsuariosAsignadosAsync()).ReturnsAsync(Array.Empty<TicketBoardAssignmentViewModel>());
        backend.Setup(service => service.GetTicketAttachmentsAsync()).ReturnsAsync(Array.Empty<TicketBoardAttachmentViewModel>());
        backend.Setup(service => service.GetUsuariosAsync()).ReturnsAsync(Array.Empty<UsuarioLookupViewModel>());
    }

    private static FormFile CreateFormFile(string fileName, byte[] content)
    {
        var stream = new MemoryStream(content);
        return new FormFile(stream, 0, content.Length, "AttachmentForm.Archivo", fileName)
        {
            Headers = new HeaderDictionary(),
            ContentType = "application/octet-stream"
        };
    }

    private static string CreateTempDirectory()
    {
        var path = Path.Combine(Path.GetTempPath(), "cq500-web-tests", Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(path);
        return path;
    }

    private static void DeleteDirectory(string path)
    {
        if (!Directory.Exists(path))
        {
            return;
        }

        try
        {
            Directory.Delete(path, true);
        }
        catch
        {
        }
    }
}
