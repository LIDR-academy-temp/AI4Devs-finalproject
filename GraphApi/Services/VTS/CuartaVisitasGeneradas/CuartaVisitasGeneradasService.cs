using System.Data;
using System.Security.Cryptography;
using GraphApi.Models.VTS.CuartaVisitasGeneradas;
using GraphApi.Repositories.VTS;
using Microsoft.AspNetCore.Http;

namespace GraphApi.Services.VTS.CuartaVisitasGeneradas;

public sealed class CuartaVisitasGeneradasService(
    ICuartaVisitasGeneradasRepository repo,
    IDbConnection db) : ICuartaVisitasGeneradasService
{
    public async Task<(PaseVisitaDto? Pase, string? Code, int Status, string? Detail)> CrearPaseAsync(
        CrearPaseRequest request, int usuarioId, string correo, CancellationToken ct = default)
    {
        var nombre = request.NombreVisitante.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "PASE_NOMBRE_REQUERIDO", StatusCodes.Status422UnprocessableEntity, "El nombre del visitante es obligatorio.");

        if (request.FechaFin <= request.FechaInicio)
            return (null, "PASE_FECHAS_INVALIDAS", StatusCodes.Status422UnprocessableEntity, "La vigencia fin debe ser posterior al inicio.");

        var casaId = await repo.ResolverCasaIdUsuarioAsync(usuarioId, ct);
        if (casaId is null or <= 0)
            return (null, "PASE_CASA_NO_ENCONTRADA", StatusCodes.Status422UnprocessableEntity, "No hay casa vigente asociada al residente.");

        var tipoId = await repo.ResolverTipoIdentificacionIdAsync(request.TipoIdentificacionId, ct);
        if (tipoId is null)
            return (null, "PASE_TIPO_IDENT_INVALIDO", StatusCodes.Status422UnprocessableEntity, "No hay tipos de identificación configurados.");

        var numeroId = string.IsNullOrWhiteSpace(request.NumeroIdentificacion)
            ? "N/A"
            : request.NumeroIdentificacion.Trim();

        var fechaEmision = request.FechaInicio.ToUniversalTime();
        var fechaExpira = request.TodoElDia
            ? request.FechaFin.Date.AddDays(1).AddTicks(-1).ToUniversalTime()
            : request.FechaFin.ToUniversalTime();

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
                    request, usuarioId, casaId.Value, tipoId.Value, numeroId, codigoQr,
                    fechaEmision, fechaExpira, correo, usuarioId, tx);
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

    public async Task<IReadOnlyList<PaseVisitaDto>> ListMiasAsync(int usuarioId, CancellationToken ct = default)
    {
        var list = await repo.ListMiasAsync(usuarioId, ct);
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
        if (estado == "NoEncontrado")
            return (null, "PASE_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Pase no encontrado.");

        if (actual.BUsado)
        {
            return (new UsarPaseResponse { Ok = true, YaUsado = true, Pase = actual },
                null, StatusCodes.Status200OK, null);
        }

        if (db.State != ConnectionState.Open) db.Open();
        using (var tx = db.BeginTransaction())
        {
            try
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
        return (new UsarPaseResponse { Ok = true, YaUsado = false, Pase = usado },
            null, StatusCodes.Status200OK, null);
    }

    public static string ResolverEstadoValidacion(PaseVisitaDto pase)
    {
        if (pase.BUsado) return "Usado";
        if (pase.FechaExpira.HasValue && pase.FechaExpira.Value < DateTime.UtcNow) return "Expirado";
        return "Valido";
    }

    internal static void EnriquecerEstadoLista(PaseVisitaDto pase)
    {
        pase.EstadoLista = pase.BUsado
            ? "usado"
            : pase.FechaExpira.HasValue && pase.FechaExpira.Value < DateTime.UtcNow
                ? "expirado"
                : "vigente";
    }

    private static string MensajeValidacion(string estado) => estado switch
    {
        "Valido" => "Pase vigente. Puedes registrar la entrada.",
        "Expirado" => "El pase ya expiró.",
        "Usado" => "Este pase ya fue utilizado.",
        _ => "Código no encontrado.",
    };
}
