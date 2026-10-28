using System.Data;
using GraphApi.Models.JNT.CuartaJuntas;
using GraphApi.Repositories.JNT;

namespace GraphApi.Services.JNT.CuartaJuntas;

public sealed class CuartaJuntasService(
    ICuartaJuntasRepository repo,
    IDbConnection db) : ICuartaJuntasService
{
    public Task<IReadOnlyList<JuntaListItemDto>> ListarAsync(CancellationToken ct = default)
        => repo.ListarAsync(ct);

    public Task<JuntaDetalleDto?> ObtenerAsync(int juntaId, CancellationToken ct = default)
        => repo.ObtenerAsync(juntaId, ct);

    // ── Crear ────────────────────────────────────────────────────────────────
    public async Task<(JuntaDetalleDto? Junta, string? Code, int Status, string? Detail)> CrearAsync(
        JuntaCrearRequest request,
        string correo,
        int adminId,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(request.Titulo))
            return (null, "JNT_TITULO_REQUERIDO", 422, "El título es obligatorio.");

        if (request.FechaProgramada == default)
            return (null, "JNT_FECHA_REQUERIDA", 422, "La fecha programada es obligatoria.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var juntaId = await repo.InsertJuntaAsync(request, correo, adminId, tx);

            if (!string.IsNullOrWhiteSpace(request.Contenido))
                await repo.InsertDetalleAsync(juntaId, request.Contenido, correo, adminId, tx);

            tx.Commit();

            var junta = await repo.ObtenerAsync(juntaId, ct);
            return (junta, null, 201, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    // ── Actualizar ───────────────────────────────────────────────────────────
    public async Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarAsync(
        int juntaId,
        JuntaActualizarRequest request,
        string correo,
        int adminId,
        CancellationToken ct = default)
    {
        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var ok = await repo.ActualizarAsync(juntaId, request, correo, adminId, tx);
            if (!ok)
            {
                tx.Rollback();
                return (false, "JNT_NOT_FOUND", 404, $"Junta {juntaId} no encontrada.");
            }
            tx.Commit();
            return (true, null, 200, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    // ── Eliminar ─────────────────────────────────────────────────────────────
    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(
        int juntaId,
        string correo,
        int adminId,
        CancellationToken ct = default)
    {
        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var ok = await repo.SoftDeleteAsync(juntaId, correo, adminId, tx);
            if (!ok)
            {
                tx.Rollback();
                return (false, "JNT_NOT_FOUND", 404, $"Junta {juntaId} no encontrada.");
            }
            tx.Commit();
            return (true, null, 204, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }
}
