using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Documentos")]
    public sealed class DocumentosController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IResidentPortalService _residentPortal;

        public DocumentosController(IGraphApiBackendService backend, IResidentPortalService residentPortal)
        {
            _backend = backend;
            _residentPortal = residentPortal;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index(string? search = null, string? category = null)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var allDocuments = await LoadResidentDocumentsAsync();
            var categories = allDocuments
                .Select(item => item.TipoArchivo?.Trim())
                .Where(item => !string.IsNullOrWhiteSpace(item))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .Cast<string>()
                .OrderBy(item => item)
                .ToList();

            var filtered = allDocuments
                .Where(item => string.IsNullOrWhiteSpace(search)
                    || item.Nombre.Contains(search, StringComparison.OrdinalIgnoreCase)
                    || (item.TipoArchivo?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false)
                    || (item.Ruta?.Contains(search, StringComparison.OrdinalIgnoreCase) ?? false))
                .Where(item => string.IsNullOrWhiteSpace(category)
                    || string.Equals(item.TipoArchivo?.Trim(), category.Trim(), StringComparison.OrdinalIgnoreCase))
                .ToList();

            var model = new ResidentDocumentListPageViewModel
            {
                Context = context,
                Items = filtered,
                Categories = categories,
                Search = string.IsNullOrWhiteSpace(search) ? null : search.Trim(),
                Category = string.IsNullOrWhiteSpace(category) ? null : category.Trim(),
                Message = TempData["Message"]?.ToString(),
                Error = TempData["Error"]?.ToString()
            };

            return View("~/Views/Residente/Documentos/Index.cshtml", model);
        }

        [HttpGet("{archivoId:int}")]
        public async Task<IActionResult> Detail(int archivoId)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var allDocuments = await LoadResidentDocumentsAsync();
            var document = allDocuments.FirstOrDefault(item => item.ArchivoID == archivoId);
            if (document is null)
            {
                TempData["Error"] = "El documento solicitado no está disponible para tu portal.";
                return Redirect("/Residente/Documentos");
            }

            var model = new ResidentDocumentDetailViewModel
            {
                Context = context,
                Document = document,
                RelatedDocuments = allDocuments
                    .Where(item => item.ArchivoID != archivoId)
                    .Take(3)
                    .ToList(),
                Message = TempData["Message"]?.ToString(),
                Error = TempData["Error"]?.ToString()
            };

            return View("~/Views/Residente/Documentos/Detail.cshtml", model);
        }

        private async Task<List<ArchivoFormViewModel>> LoadResidentDocumentsAsync()
        {
            return (await _backend.GetAllArchivosAsync())
                .Where(item => !item.bEliminado && !item.EsPrivado)
                .OrderBy(item => item.TipoArchivo)
                .ThenBy(item => item.Nombre)
                .ToList();
        }

        private IActionResult? GuardResidentContext(ResidentPortalContextViewModel context)
        {
            if (context.IsAdministrador)
            {
                return RedirectToAction("Index", "Home");
            }

            if (!context.IsResident || !context.HasAssignedProperties || context.RequiresPropertySelection || !context.HasActiveProperty)
            {
                if (TempData["Error"] is null && !string.IsNullOrWhiteSpace(context.StatusMessage))
                {
                    TempData["Error"] = context.StatusMessage;
                }

                return RedirectToAction("Index", "Acceso");
            }

            return null;
        }
    }
}