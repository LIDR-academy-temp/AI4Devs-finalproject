using System.Data;
using GraphApi.Models.USR.CuartaMascotas;
using GraphApi.Repositories.USR;
using Microsoft.AspNetCore.Http;

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
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number == 547)
        {
            tx.Rollback();
            return (422, null, "Tipo, raza o propietario no válido.");
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

    public async Task<(MascotaListItemDto? Mascota, string? Code, int Status, string? Detail)> CrearParaUsuarioAsync(
        MascotaCrearAdminRequest req, string correoAdmin, int adminUserId, CancellationToken ct = default)
    {
        if (req.UsuarioId <= 0)
            return (null, "MAS_USUARIO_INVALIDO", StatusCodes.Status422UnprocessableEntity, "El propietario (usuarioId) es obligatorio.");

        if (!await repo.UsuarioActivoAsync(req.UsuarioId, ct))
            return (null, "MAS_USUARIO_INVALIDO", StatusCodes.Status422UnprocessableEntity, "El usuario propietario no existe o está inactivo.");

        if (string.IsNullOrWhiteSpace(req.NombreMascota))
            return (null, "MAS_NOMBRE_REQUERIDO", StatusCodes.Status422UnprocessableEntity, "El nombre de la mascota es requerido.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var crear = new MascotaCrearRequest(
                req.NombreMascota.Trim(),
                req.TipoMascotaId,
                req.RazaMascotaId,
                req.RazaLibre,
                req.VacunasAlDia,
                req.FechaUltimaVacuna,
                req.FechaNacimiento);
            var id = await repo.InsertAsync(crear, correoAdmin, req.UsuarioId, tx);
            tx.Commit();
            var padron = await repo.ListarPadronAsync(ct);
            var nuevo = padron.FirstOrDefault(m => m.MascotaId == id);
            return (nuevo, null, StatusCodes.Status201Created, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number == 547)
        {
            tx.Rollback();
            return (null, "MAS_REFERENCIA_INVALIDA", StatusCodes.Status422UnprocessableEntity, "Tipo, raza o propietario no válido.");
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarComoAdminAsync(
        int mascotaId, MascotaActualizarRequest req, string correoAdmin, CancellationToken ct = default)
    {
        if (!await repo.ExisteMascotaActivaAsync(mascotaId, ct))
            return (false, "MAS_NOT_FOUND", StatusCodes.Status404NotFound, "Mascota no encontrada.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var ok = await repo.ActualizarAsync(mascotaId, req, correoAdmin, tx);
            if (!ok) { tx.Rollback(); return (false, "MAS_NOT_FOUND", StatusCodes.Status404NotFound, "Mascota no encontrada."); }
            tx.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarComoAdminAsync(
        int mascotaId, string correoAdmin, CancellationToken ct = default)
    {
        if (!await repo.ExisteMascotaActivaAsync(mascotaId, ct))
            return (false, "MAS_NOT_FOUND", StatusCodes.Status404NotFound, "Mascota no encontrada.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var ok = await repo.SoftDeleteAsync(mascotaId, correoAdmin, tx);
            if (!ok) { tx.Rollback(); return (false, "MAS_NOT_FOUND", StatusCodes.Status404NotFound, "Mascota no encontrada."); }
            tx.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(TipoMascotaDto? Data, string? Code, int Status, string? Detail)> CrearTipoAsync(
        string tipoMascota, int adminId, string correo, CancellationToken ct = default)
    {
        var nombre = tipoMascota.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "TIPO_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del tipo es requerido.");

        try
        {
            var id = await repo.InsertTipoAsync(nombre, correo, adminId);
            return (new TipoMascotaDto(id, nombre), null, StatusCodes.Status201Created, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "TIPO_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe un tipo con ese nombre.");
        }
    }

    public async Task<(TipoMascotaDto? Data, string? Code, int Status, string? Detail)> ActualizarTipoAsync(
        int tipoMascotaId, string tipoMascota, int adminId, string correo, CancellationToken ct = default)
    {
        var nombre = tipoMascota.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "TIPO_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del tipo es requerido.");

        try
        {
            var ok = await repo.UpdateTipoAsync(tipoMascotaId, nombre, correo, adminId);
            if (!ok)
                return (null, "TIPO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo de mascota no encontrado.");
            return (new TipoMascotaDto(tipoMascotaId, nombre), null, StatusCodes.Status200OK, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "TIPO_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe un tipo con ese nombre.");
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarTipoAsync(
        int tipoMascotaId, int adminId, string correo, CancellationToken ct = default)
    {
        var ok = await repo.SoftDeleteTipoAsync(tipoMascotaId, correo, adminId);
        if (!ok)
            return (false, "TIPO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo de mascota no encontrado.");
        return (true, null, StatusCodes.Status204NoContent, null);
    }

    public async Task<(RazaMascotaDto? Data, string? Code, int Status, string? Detail)> CrearRazaAsync(
        int tipoMascotaId, string razaMascota, int adminId, string correo, CancellationToken ct = default)
    {
        if (tipoMascotaId <= 0)
            return (null, "RAZA_TIPO_REQUERIDO", StatusCodes.Status400BadRequest, "El tipo de mascota es requerido.");

        if (!await repo.ExisteTipoActivoAsync(tipoMascotaId, ct))
            return (null, "TIPO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo de mascota no encontrado.");

        var nombre = razaMascota.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "RAZA_REQUERIDA", StatusCodes.Status400BadRequest, "El nombre de la raza es requerido.");

        try
        {
            var id = await repo.InsertRazaAsync(tipoMascotaId, nombre, correo, adminId);
            return (new RazaMascotaDto(id, nombre, tipoMascotaId), null, StatusCodes.Status201Created, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "RAZA_DUPLICADA", StatusCodes.Status409Conflict, "Ya existe esa raza para el tipo seleccionado.");
        }
    }

    public async Task<(RazaMascotaDto? Data, string? Code, int Status, string? Detail)> ActualizarRazaAsync(
        int razaMascotaId, int tipoMascotaId, string razaMascota, int adminId, string correo, CancellationToken ct = default)
    {
        if (tipoMascotaId <= 0)
            return (null, "RAZA_TIPO_REQUERIDO", StatusCodes.Status400BadRequest, "El tipo de mascota es requerido.");

        if (!await repo.ExisteTipoActivoAsync(tipoMascotaId, ct))
            return (null, "TIPO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo de mascota no encontrado.");

        var nombre = razaMascota.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "RAZA_REQUERIDA", StatusCodes.Status400BadRequest, "El nombre de la raza es requerido.");

        try
        {
            var ok = await repo.UpdateRazaAsync(razaMascotaId, tipoMascotaId, nombre, correo, adminId);
            if (!ok)
                return (null, "RAZA_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Raza no encontrada.");
            return (new RazaMascotaDto(razaMascotaId, nombre, tipoMascotaId), null, StatusCodes.Status200OK, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "RAZA_DUPLICADA", StatusCodes.Status409Conflict, "Ya existe esa raza para el tipo seleccionado.");
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarRazaAsync(
        int razaMascotaId, int adminId, string correo, CancellationToken ct = default)
    {
        var ok = await repo.SoftDeleteRazaAsync(razaMascotaId, correo, adminId);
        if (!ok)
            return (false, "RAZA_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Raza no encontrada.");
        return (true, null, StatusCodes.Status204NoContent, null);
    }
}
