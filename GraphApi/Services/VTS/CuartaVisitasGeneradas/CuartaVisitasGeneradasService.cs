using System.Data;
using System.Security.Cryptography;
using GraphApi.Models.VTS.CuartaVisitas;
using GraphApi.Models.VTS.CuartaVisitasGeneradas;
using GraphApi.Repositories.VTS;
using Microsoft.AspNetCore.Http;

namespace GraphApi.Services.VTS.CuartaVisitasGeneradas;

public sealed class CuartaVisitasGeneradasService(
    ICuartaVisitasGeneradasRepository repo,
    ICuartaVisitasRepository visitasRepo,
    IDbConnection db) : ICuartaVisitasGeneradasService
{
    public async Task<(PaseVisitaDto? Pase, string? Code, int Status, string? Detail)> CrearPaseAsync(
        CrearPaseRequest request, int usuarioId, string correo, CancellationToken ct = default)
        => await CrearPaseInternoAsync(request, usuarioId, usuarioId, correo, null, ct);

    public async Task<(PaseVisitaDto? Pase, string? Code, int Status, string? Detail)> CrearPaseAdminAsync(
        CrearPaseAdminRequest request, int adminId, string adminCorreo, CancellationToken ct = default)
    {
        if (request.UsuarioVisitadoId <= 0)
        {
            return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Seleccione un residente visitado.");
        }

        return await CrearPaseInternoAsync(request, request.UsuarioVisitadoId, adminId, adminCorreo, request.CasaId, ct);
    }

    private async Task<(PaseVisitaDto? Pase, string? Code, int Status, string? Detail)> CrearPaseInternoAsync(
        CrearPaseRequest request,
        int residenteUsuarioId,
        int auditUserId,
        string auditCorreo,
        int? casaIdExplicito = null,
        CancellationToken ct = default)
    {
        var nombre = request.NombreVisitante.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "PASE_NOMBRE_REQUERIDO", StatusCodes.Status422UnprocessableEntity, "El nombre del visitante es obligatorio.");

        var (fechaEmision, fechaExpira, vigenciaError) = TryComputeVigencia(request);
        if (vigenciaError is not null)
            return (null, vigenciaError.Value.Code, vigenciaError.Value.Status, vigenciaError.Value.Detail);

        var casaId = casaIdExplicito is > 0 ? casaIdExplicito : await repo.ResolverCasaIdUsuarioAsync(residenteUsuarioId, ct);
        if (casaId is null or <= 0)
        {
            return (null, "PASE_CASA_NO_ENCONTRADA", StatusCodes.Status422UnprocessableEntity,
                "No hay casa vigente asociada al residente. Asigne casa en Usuarios o elija una casa en el formulario.");
        }

        if (!await repo.CasaActivaExisteAsync(casaId.Value, ct))
            return (null, "PASE_CASA_INVALIDA", StatusCodes.Status422UnprocessableEntity, "La casa seleccionada no existe o está inactiva.");

        var tipoId = await repo.ResolverTipoIdentificacionIdAsync(request.TipoIdentificacionId, ct);
        if (tipoId is null)
            return (null, "PASE_TIPO_IDENT_INVALIDO", StatusCodes.Status422UnprocessableEntity, "No hay tipos de identificación configurados.");

        var numeroId = string.IsNullOrWhiteSpace(request.NumeroIdentificacion)
            ? "N/A"
            : request.NumeroIdentificacion.Trim();

        if (db.State != ConnectionState.Open) db.Open();
        int newId;
        using (var tx = db.BeginTransaction())
        {
            try
            {
                string codigoQr;
                var intentos = 0;
                do
                {
                    codigoQr = Convert.ToHexString(RandomNumberGenerator.GetBytes(16));
                    intentos++;
                    if (intentos > 8)
                        throw new InvalidOperationException("No se pudo generar un código QR único.");
                } while (await repo.ExisteCodigoQrAsync(codigoQr, tx));

                newId = await repo.InsertPaseAsync(
                    request, residenteUsuarioId, casaId.Value, tipoId.Value, numeroId, codigoQr,
                    fechaEmision, fechaExpira, auditCorreo, auditUserId, tx);
                tx.Commit();
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        var pase = await repo.GetByIdAsync(newId, ct);
        if (pase is null)
            return (null, "PASE_NO_RECUPERADO", StatusCodes.Status500InternalServerError, "El pase se creó pero no pudo leerse.");

        EnriquecerEstadoLista(pase);
        return (pase, null, StatusCodes.Status201Created, null);
    }

    public async Task<(PaseVisitaDto? Pase, string? Code, int Status, string? Detail)> ActualizarPaseAdminAsync(
        int visitaGeneradaId, CrearPaseAdminRequest request, int adminId, string adminCorreo, CancellationToken ct = default)
    {
        if (request.UsuarioVisitadoId <= 0)
            return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Seleccione un residente visitado.");

        var actual = await repo.GetByIdAsync(visitaGeneradaId, ct);
        if (actual is null)
            return (null, "PASE_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Pase no encontrado.");

        EnriquecerEstadoLista(actual);
        if (actual.UnaOcasion && actual.BUsado)
            return (null, "PASE_YA_USADO", StatusCodes.Status409Conflict, "No se puede modificar un pase de una ocasión ya utilizado.");
        if (actual.EstadoLista == "expirado")
            return (null, "PASE_EXPIRADO", StatusCodes.Status409Conflict, "No se puede modificar un pase expirado.");

        var nombre = request.NombreVisitante.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "PASE_NOMBRE_REQUERIDO", StatusCodes.Status422UnprocessableEntity, "El nombre del visitante es obligatorio.");

        var (fechaEmisionUpd, fechaExpiraUpd, vigenciaErrorUpd) = TryComputeVigencia(request);
        if (vigenciaErrorUpd is not null)
            return (null, vigenciaErrorUpd.Value.Code, vigenciaErrorUpd.Value.Status, vigenciaErrorUpd.Value.Detail);

        var casaId = request.CasaId is > 0
            ? request.CasaId
            : actual.CasaId ?? await repo.ResolverCasaIdUsuarioAsync(request.UsuarioVisitadoId, ct);
        if (casaId is null or <= 0)
            return (null, "PASE_CASA_NO_ENCONTRADA", StatusCodes.Status422UnprocessableEntity, "No hay casa asociada al residente.");
        if (!await repo.CasaActivaExisteAsync(casaId.Value, ct))
            return (null, "PASE_CASA_INVALIDA", StatusCodes.Status422UnprocessableEntity, "La casa seleccionada no es válida.");

        var tipoId = await repo.ResolverTipoIdentificacionIdAsync(request.TipoIdentificacionId, ct);
        if (tipoId is null)
            return (null, "PASE_TIPO_IDENT_INVALIDO", StatusCodes.Status422UnprocessableEntity, "Tipo de identificación inválido.");

        var numeroId = string.IsNullOrWhiteSpace(request.NumeroIdentificacion)
            ? "N/A"
            : request.NumeroIdentificacion.Trim();

        var affected = await repo.UpdatePaseAsync(
            visitaGeneradaId, request, request.UsuarioVisitadoId, casaId.Value, tipoId.Value, numeroId,
            fechaEmisionUpd, fechaExpiraUpd, adminCorreo, adminId);
        if (affected == 0)
            return (null, "PASE_UPDATE_CONFLICTO", StatusCodes.Status409Conflict, "No se pudo actualizar el pase.");

        var pase = await repo.GetByIdAsync(visitaGeneradaId, ct);
        if (pase is null)
            return (null, "PASE_NO_RECUPERADO", StatusCodes.Status500InternalServerError, "El pase se actualizó pero no pudo leerse.");

        EnriquecerEstadoLista(pase);
        return (pase, null, StatusCodes.Status200OK, null);
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> CancelarPaseAdminAsync(
        int visitaGeneradaId, int adminId, string adminCorreo, CancellationToken ct = default)
    {
        var actual = await repo.GetByIdAsync(visitaGeneradaId, ct);
        if (actual is null)
            return (false, "PASE_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Pase no encontrado.");

        var ok = await repo.SoftDeletePaseAsync(visitaGeneradaId, adminCorreo, adminId);
        if (!ok)
            return (false, "PASE_CANCEL_CONFLICTO", StatusCodes.Status409Conflict, "No se pudo cancelar el pase.");

        return (true, null, StatusCodes.Status204NoContent, null);
    }

    private static (DateTime FechaEmision, DateTime FechaExpira, (string Code, int Status, string Detail)? Error) TryComputeVigencia(
        CrearPaseRequest request)
    {
        if (request.UnaOcasion)
        {
            if (request.FechaFin <= request.FechaInicio)
                return (default, default, ("PASE_FECHAS_INVALIDAS", StatusCodes.Status422UnprocessableEntity, "La vigencia fin debe ser posterior al inicio."));
            var emision = request.FechaInicio.ToUniversalTime();
            var expira = request.TodoElDia
                ? request.FechaFin.Date.AddDays(1).AddTicks(-1).ToUniversalTime()
                : request.FechaFin.ToUniversalTime();
            return (emision, expira, null);
        }

        if (request.FechaFin.Date < request.FechaInicio.Date)
            return (default, default, ("PASE_FECHAS_INVALIDAS", StatusCodes.Status422UnprocessableEntity, "La fecha fin del rango no puede ser anterior al inicio."));

        var inicio = request.FechaInicio.Date.ToUniversalTime();
        var fin = request.FechaFin.Date.AddDays(1).AddTicks(-1).ToUniversalTime();
        if (fin <= inicio)
            return (default, default, ("PASE_FECHAS_INVALIDAS", StatusCodes.Status422UnprocessableEntity, "El rango de días debe tener al menos un día."));
        return (inicio, fin, null);
    }

    public async Task<IReadOnlyList<PaseVisitaDto>> ListMiasAsync(int usuarioId, CancellationToken ct = default)
    {
        var list = await repo.ListMiasAsync(usuarioId, ct);
        foreach (var p in list) EnriquecerEstadoLista(p);
        return list;
    }

    public async Task<IReadOnlyList<PaseVisitaDto>> ListAdminAsync(
        int? casaId, DateTime? desde, DateTime? hasta, CancellationToken ct = default)
    {
        var list = await repo.ListAdminAsync(casaId, desde, hasta, ct);
        foreach (var p in list) EnriquecerEstadoLista(p);
        return list;
    }

    public async Task<ValidarPaseResponse> ValidarAsync(string codigoQr, CancellationToken ct = default)
    {
        var codigo = codigoQr.Trim();
        if (string.IsNullOrEmpty(codigo))
        {
            return new ValidarPaseResponse
            {
                Estado = "NoEncontrado",
                Detalle = "Ingresa un código QR.",
            };
        }

        var pase = await repo.GetByCodigoAsync(codigo, ct);
        if (pase is null)
        {
            return new ValidarPaseResponse
            {
                Estado = "NoEncontrado",
                Detalle = "No se encontró un pase con ese código.",
            };
        }

        EnriquecerEstadoLista(pase);
        var estado = ResolverEstadoValidacion(pase);
        return new ValidarPaseResponse
        {
            Estado = estado,
            Detalle = MensajeValidacion(estado),
            Pase = pase,
        };
    }

    public async Task<(UsarPaseResponse? Response, string? Code, int Status, string? Detail)> UsarAsync(
        int visitaGeneradaId, string correo, int userId, CancellationToken ct = default)
    {
        var actual = await repo.GetByIdAsync(visitaGeneradaId, ct);
        if (actual is null)
            return (null, "PASE_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Pase no encontrado.");

        EnriquecerEstadoLista(actual);
        var estado = ResolverEstadoValidacion(actual);
        if (estado == "Expirado")
            return (null, "PASE_EXPIRADO", StatusCodes.Status409Conflict, "El pase está expirado.");
        if (estado == "NoVigente")
            return (null, "PASE_NO_VIGENTE", StatusCodes.Status409Conflict, "El pase aún no está vigente.");
        if (estado == "NoEncontrado")
            return (null, "PASE_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Pase no encontrado.");

        if (actual.UnaOcasion && actual.BUsado)
        {
            return (new UsarPaseResponse { Ok = true, YaUsado = true, Pase = actual },
                null, StatusCodes.Status200OK, null);
        }

        if (db.State != ConnectionState.Open) db.Open();
        int? visitaBitacoraId = null;
        using (var tx = db.BeginTransaction())
        {
            try
            {
                if (actual.UnaOcasion)
                {
                    var affected = await repo.MarcarUsadoAsync(visitaGeneradaId, correo, userId, tx);
                    if (affected == 0)
                    {
                        tx.Rollback();
                        var refreshed = await repo.GetByIdAsync(visitaGeneradaId, ct);
                        if (refreshed is not null && refreshed.BUsado)
                        {
                            EnriquecerEstadoLista(refreshed);
                            return (new UsarPaseResponse { Ok = true, YaUsado = true, Pase = refreshed },
                                null, StatusCodes.Status200OK, null);
                        }
                        return (null, "PASE_USO_CONFLICTO", StatusCodes.Status409Conflict, "No se pudo marcar el pase como usado.");
                    }
                }
                else
                {
                    await repo.InsertLogUsoAsync(visitaGeneradaId, correo, userId, tx);
                }

                visitaBitacoraId = await RegistrarBitacoraDesdePaseAsync(actual, correo, userId, tx);

                tx.Commit();
            }
            catch
            {
                tx.Rollback();
                throw;
            }
        }

        var usado = await repo.GetByIdAsync(visitaGeneradaId, ct);
        if (usado is not null) EnriquecerEstadoLista(usado);
        return (new UsarPaseResponse { Ok = true, YaUsado = false, Pase = usado, VisitaId = visitaBitacoraId },
            null, StatusCodes.Status200OK, null);
    }

    private async Task<int?> RegistrarBitacoraDesdePaseAsync(
        PaseVisitaDto pase, string correo, int userId, IDbTransaction tx)
    {
        if (pase.UsuarioVisitadoId <= 0)
            return null;

        var tipoNombre = string.IsNullOrWhiteSpace(pase.TipoIdentificacion) ? "N/A" : pase.TipoIdentificacion.Trim();
        var tipoId = await visitasRepo.ResolverTipoIdentificacionIdAsync(tipoNombre, tx);
        if (tipoId is null)
        {
            tipoId = await repo.ResolverTipoIdentificacionIdAsync(null);
            if (tipoId is null)
                return null;
        }

        var numero = string.IsNullOrWhiteSpace(pase.NumeroIdentificacion) ? "N/A" : pase.NumeroIdentificacion.Trim();
        var visitaId = await visitasRepo.InsertVisitaAsync(
            new RegistrarVisitaRequest
            {
                VisitanteNombre = pase.NombreVisitante,
                UsuarioVisitadoId = pase.UsuarioVisitadoId,
                CasaId = pase.CasaId,
                TipoIdentificacion = tipoNombre,
                NumeroIdentificacion = numero,
            },
            tipoId.Value,
            correo,
            userId,
            tx);
        return visitaId;
    }

    public static string ResolverEstadoValidacion(PaseVisitaDto pase)
    {
        if (pase.UnaOcasion && pase.BUsado) return "Usado";
        var now = DateTime.UtcNow;
        if (pase.FechaEmision > now) return "NoVigente";
        if (pase.FechaExpira.HasValue && pase.FechaExpira.Value < now) return "Expirado";
        return "Valido";
    }

    internal static void EnriquecerEstadoLista(PaseVisitaDto pase)
    {
        var now = DateTime.UtcNow;
        if (pase.UnaOcasion && pase.BUsado)
            pase.EstadoLista = "usado";
        else if (pase.FechaExpira.HasValue && pase.FechaExpira.Value < now)
            pase.EstadoLista = "expirado";
        else if (pase.FechaEmision > now)
            pase.EstadoLista = "pendiente";
        else
            pase.EstadoLista = "vigente";
    }

    private static string MensajeValidacion(string estado) => estado switch
    {
        "Valido" => "Pase vigente. Puedes registrar la entrada.",
        "NoVigente" => "El pase aún no entra en vigencia.",
        "Expirado" => "El pase ya expiró.",
        "Usado" => "Este pase ya fue utilizado (una ocasión).",
        _ => "Código no encontrado.",
    };
}
