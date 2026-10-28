using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Web.Models.Admin;
using Web.Services;

namespace Web.Controllers.Encuestas
{
    [Authorize]
    [Route("Encuestas/Responder")]
    public class EncuestaResponderController : Controller
    {
        private readonly IGraphApiBackendService _service;

        public EncuestaResponderController(IGraphApiBackendService service)
        {
            _service = service;
        }

        // ─── Lista de encuestas activas ──────────────────────────────────────
        [HttpGet("")]
        public async Task<IActionResult> Index()
        {
            var usuarioId = CotoContext.GetUsuarioId(User);

            var encuestas = await _service.GetEncuestasAsync();
            var activas   = encuestas.Where(e => e.bActivo && !e.bEliminado).ToList();

            var items = new List<EncuestaResidenteItemViewModel>();
            foreach (var enc in activas)
            {
                var yaRespondio = enc.EncuestaID.HasValue
                    && await _service.EncuestaYaRespondidaAsync(enc.EncuestaID.Value, usuarioId);

                items.Add(new EncuestaResidenteItemViewModel
                {
                    Encuesta    = enc,
                    YaRespondio = yaRespondio
                });
            }

            var model = new EncuestasResidentePageViewModel
            {
                Items   = items,
                Message = TempData["Message"]?.ToString(),
                Error   = TempData["Error"]?.ToString()
            };

            return View("~/Views/Encuestas/EncuestasResidente.cshtml", model);
        }

        // ─── Formulario de respuesta ─────────────────────────────────────────
        [HttpGet("{encuestaId:int}")]
        public async Task<IActionResult> Responder(int encuestaId)
        {
            var usuarioId = CotoContext.GetUsuarioId(User);

            var encuestas = await _service.GetEncuestasAsync();
            var encuesta  = encuestas.FirstOrDefault(e => e.EncuestaID == encuestaId && e.bActivo && !e.bEliminado);
            if (encuesta is null)
                return RedirectToAction(nameof(Index));

            var yaRespondio = await _service.EncuestaYaRespondidaAsync(encuestaId, usuarioId);
            var preguntas   = await _service.GetPreguntasAsync(encuestaId);
            var opciones    = await _service.GetOpcionesAsync(encuestaId);

            var preguntasActivas = preguntas
                .Where(p => !p.bEliminado)
                .OrderBy(p => p.Orden)
                .ToList();

            var model = new EncuestaResponderViewModel
            {
                Encuesta    = encuesta,
                Preguntas   = preguntasActivas,
                Opciones    = opciones,
                YaRespondio = yaRespondio
            };

            return View("~/Views/Encuestas/ResponderEncuesta.cshtml", model);
        }

        // ─── Enviar respuestas ───────────────────────────────────────────────
        [HttpPost("{encuestaId:int}")]
        [ValidateAntiForgeryToken]
        public async Task<IActionResult> Responder(int encuestaId, IFormCollection form)
        {
            var usuarioId = CotoContext.GetUsuarioId(User);

            // Verificar que no haya respondido ya (segunda comprobación)
            if (await _service.EncuestaYaRespondidaAsync(encuestaId, usuarioId))
            {
                TempData["Error"] = "Ya respondiste esta encuesta anteriormente.";
                return RedirectToAction(nameof(Index));
            }

            var preguntas = await _service.GetPreguntasAsync(encuestaId);
            var respuestas = new List<RespuestaEncuestaItemViewModel>();

            foreach (var pregunta in preguntas.Where(p => !p.bEliminado))
            {
                var key  = $"p_{pregunta.PreguntaID}";
                var item = new RespuestaEncuestaItemViewModel { PreguntaID = pregunta.PreguntaID ?? 0 };

                if (form.ContainsKey(key))
                {
                    foreach (var val in form[key])
                    {
                        if (int.TryParse(val, out var opcionId))
                            item.OpcionesSeleccionadas.Add(opcionId);
                        else
                            item.RespuestaTexto = val;
                    }
                }

                // Incluir incluso si está vacía (preguntas no requeridas sin respuesta)
                if (item.OpcionesSeleccionadas.Count > 0 || !string.IsNullOrWhiteSpace(item.RespuestaTexto))
                    respuestas.Add(item);
            }

            await _service.SaveRespuestasEncuestaAsync(encuestaId, usuarioId, respuestas);

            TempData["Message"] = "¡Gracias! Tu respuesta fue registrada.";
            return RedirectToAction(nameof(Index));
        }
    }
}
