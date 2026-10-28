using System.Data;
using GraphApi.Models.USR.CuartaMascotas;
using GraphApi.Repositories.USR;

namespace GraphApi.Services.USR.CuartaMascotas;

public class CuartaMascotasService(ICuartaMascotasRepository repo, IDbConnection db) : ICuartaMascotasService
{
    public Task<IReadOnlyList<MascotaListItemDto>> ListarMisAsync(int usuarioId, CancellationToken ct = default)
        => repo.ListarMisAsync(usuarioId, ct);

    public Task<IReadOnlyList<MascotaListItemDto>> ListarPadronAsync(CancellationToken ct = default)
        => repo.ListarPadronAsync(ct);

    public async Task<(int StatusCode, int? MascotaId, string? Error)> CrearAsync(
        MascotaCrearRequest req, string correo, int usuarioId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.NombreMascota))
            return (422, null, "El nombre de la mascota es requerido.");

        db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var id = await repo.InsertAsync(req, correo, usuarioId, tx);
            tx.Commit();
            return (201, id, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(int StatusCode, string? Error)> ActualizarAsync(
        int mascotaId, MascotaActualizarRequest req, string correo, int usuarioId, CancellationToken ct = default)
    {
        if (!await repo.ExisteMascotaAsync(mascotaId, usuarioId))
            return (404, "Mascota no encontrada.");

        db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            await repo.ActualizarAsync(mascotaId, req, correo, tx);
            tx.Commit();
            return (204, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(int StatusCode, string? Error)> EliminarAsync(
        int mascotaId, string correo, int usuarioId, CancellationToken ct = default)
    {
        if (!await repo.ExisteMascotaAsync(mascotaId, usuarioId))
            return (404, "Mascota no encontrada.");

        db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            await repo.SoftDeleteAsync(mascotaId, correo, tx);
            tx.Commit();
            return (204, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public Task<IReadOnlyList<TipoMascotaDto>> ListarTiposAsync(CancellationToken ct = default)
        => repo.ListarTiposAsync(ct);

    public Task<IReadOnlyList<RazaMascotaDto>> ListarRazasAsync(CancellationToken ct = default)
        => repo.ListarRazasAsync(ct);
}
