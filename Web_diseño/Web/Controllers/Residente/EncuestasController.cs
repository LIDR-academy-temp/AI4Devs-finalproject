using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Models.Residente;
using Web.Services;

namespace Web.Controllers.Residente
{
    [Authorize]
    [Route("Residente/Encuestas")]
    public sealed class EncuestasController : Controller
    {
        private readonly IGraphApiBackendService _backend;
        private readonly IResidentPortalService _residentPortal;

        public EncuestasController(IGraphApiBackendService backend, IResidentPortalService residentPortal)
        {
            _backend = backend;
            _residentPortal = residentPortal;
        }

        [HttpGet("")]
        public async Task<IActionResult> Index()
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var activeSurveys = (await _backend.GetEncuestasAsync())
                .Where(item => item.bActivo && !item.bEliminado)
                .OrderBy(item => item.FechaFin)
                .ThenBy(item => item.Titulo)
                .ToList();

            var residentItems = await Task.WhenAll(activeSurveys.Select(async survey => new EncuestaResidenteItemViewModel
            {
                Encuesta = survey,
                YaRespondio = survey.EncuestaID.HasValue
                    && await _backend.EncuestaYaRespondidaAsync(survey.EncuestaID.Value, context.UsuarioId)
            }));

            var model = new ResidentSurveyListPageViewModel
            {
                Context = context,
                Items = residentItems,
                PendingCount = residentItems.Count(item => !item.YaRespondio),
                Message = TempData["Message"]?.ToString(),
                Error = TempData["Error"]?.ToString()
            };

            return View("~/Views/Residente/Encuestas/Index.cshtml", model);
        }

        [HttpGet("{encuestaId:int}")]
        public async Task<IActionResult> Responder(int encuestaId)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            var encuestas = await _backend.GetEncuestasAsync();
            var encuesta = encuestas.FirstOrDefault(item => item.EncuestaID == encuestaId && item.bActivo && !item.bEliminado);
            if (encuesta is null)
            {
                return Redirect("/Residente/Encuestas");
            }

            var yaRespondio = await _backend.EncuestaYaRespondidaAsync(encuestaId, context.UsuarioId);
            var preguntas = await _backend.GetPreguntasAsync(encuestaId);
            var opciones = await _backend.GetOpcionesAsync(encuestaId);

            var model = new ResidentSurveyDetailViewModel
            {
                Context = context,
                Encuesta = encuesta,
                Preguntas = preguntas.Where(item => !item.bEliminado).OrderBy(item => item.Orden).ToList(),
                Opciones = opciones.Where(item => !item.bEliminado).ToList(),
                YaRespondio = yaRespondio,
                Message = TempData["Message"]?.ToString(),
                Error = TempData["Error"]?.ToString()
            };

            return View("~/Views/Residente/Encuestas/Responder.cshtml", model);
        }

        [HttpPost("{encuestaId:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Responder(int encuestaId, IFormCollection form)
        {
            var context = await _residentPortal.GetContextAsync(User);
            var redirect = GuardResidentContext(context);
            if (redirect is not null)
            {
                return redirect;
            }

            if (await _backend.EncuestaYaRespondidaAsync(encuestaId, context.UsuarioId))
            {
                TempData["Error"] = "Ya respondiste esta encuesta anteriormente.";
                return Redirect("/Residente/Encuestas");
            }

            var preguntas = await _backend.GetPreguntasAsync(encuestaId);
            var respuestas = new List<RespuestaEncuestaItemViewModel>();

            foreach (var pregunta in preguntas.Where(item => !item.bEliminado))
            {
                var key = $"p_{pregunta.PreguntaID}";
                var respuesta = new RespuestaEncuestaItemViewModel
                {
                    PreguntaID = pregunta.PreguntaID ?? 0
                };

                if (form.ContainsKey(key))
                {
                    foreach (var value in form[key])
                    {
                        if (int.TryParse(value, out var opcionId))
                        {
                            respuesta.OpcionesSeleccionadas.Add(opcionId);
                        }
                        else
                        {
                            respuesta.RespuestaTexto = value;
                        }
                    }
                }

                if (respuesta.OpcionesSeleccionadas.Count > 0 || !string.IsNullOrWhiteSpace(respuesta.RespuestaTexto))
                {
                    respuestas.Add(respuesta);
                }
            }

            await _backend.SaveRespuestasEncuestaAsync(encuestaId, context.UsuarioId, respuestas);

            TempData["Message"] = "¡Gracias! Tu respuesta fue registrada.";
            return Redirect("/Residente/Encuestas");
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