using System.Data;
using GraphApi.Models.USR.CuartaAutomoviles;
using GraphApi.Repositories.USR;
using Microsoft.AspNetCore.Http;

namespace GraphApi.Services.USR.CuartaAutomoviles;

public sealed class CuartaAutomovilesService(
    ICuartaAutomovilesRepository repo,
    IDbConnection db) : ICuartaAutomovilesService
{
    public Task<IReadOnlyList<AutomovilListItemDto>> ListarMisAsync(int usuarioId, CancellationToken ct = default)
        => repo.ListarMisAsync(usuarioId, ct);

    public Task<IReadOnlyList<AutomovilListItemDto>> ListarPadronAsync(CancellationToken ct = default)
        => repo.ListarPadronAsync(ct);

    public Task<IReadOnlyList<AutomovilListItemDto>> BuscarPorPlacasAsync(string placas, CancellationToken ct = default)
        => repo.BuscarPorPlacasAsync(placas, ct);

    public Task<IReadOnlyList<MarcaDto>> ListarMarcasAsync(CancellationToken ct = default)
        => repo.ListarMarcasAsync(ct);

    public Task<IReadOnlyList<ModeloDto>> ListarModelosAsync(CancellationToken ct = default)
        => repo.ListarModelosAsync(ct);

    public async Task<(AutomovilListItemDto? Auto, string? Code, int Status, string? Detail)> CrearAsync(
        AutomovilCrearRequest req, string correo, int usuarioId, CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(req.Placas))
            return (null, "VEH_PLACAS_REQUERIDAS", 422, "Las placas son obligatorias.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var existe = await repo.ExistePlacaAsync(req.Placas.Trim().ToUpperInvariant(), null, tx);
            if (existe)
            {
                tx.Rollback();
                return (null, "VEH_PLACAS_DUPLICADAS", 409, $"Ya existe un vehículo con las placas '{req.Placas}'.");
            }

            var crear = new AutomovilCrearRequest
            {
                MarcaId = req.MarcaId,
                ModeloId = req.ModeloId,
                ModeloLibre = req.ModeloLibre,
                Placas = req.Placas.Trim().ToUpperInvariant(),
                Color = req.Color,
            };
            var id = await repo.InsertAsync(crear, correo, usuarioId, tx);
            tx.Commit();

            var lista = await repo.ListarMisAsync(usuarioId, ct);
            var nuevo = lista.FirstOrDefault(a => a.AutomovilId == id);
            return (nuevo, null, 201, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarAsync(
        int automovilId, AutomovilActualizarRequest req, string correo, int usuarioId, CancellationToken ct = default)
    {
        var esDuenio = await repo.EsDuenioAsync(automovilId, usuarioId);
        if (!esDuenio)
            return (false, "VEH_NOT_FOUND", 404, "Vehículo no encontrado o no pertenece al usuario.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            if (!string.IsNullOrWhiteSpace(req.Placas))
            {
                var existe = await repo.ExistePlacaAsync(req.Placas.Trim().ToUpperInvariant(), automovilId, tx);
                if (existe)
                {
                    tx.Rollback();
                    return (false, "VEH_PLACAS_DUPLICADAS", 409, $"Las placas '{req.Placas}' ya están en uso.");
                }
            }

            AutomovilActualizarRequest actualizar = req;
            if (req.Placas is not null)
            {
                actualizar = new AutomovilActualizarRequest
                {
                    MarcaId = req.MarcaId,
                    ModeloId = req.ModeloId,
                    ModeloLibre = req.ModeloLibre,
                    Placas = req.Placas.Trim().ToUpperInvariant(),
                    Color = req.Color,
                };
            }

            var ok = await repo.ActualizarAsync(automovilId, actualizar, correo, tx);
            if (!ok) { tx.Rollback(); return (false, "VEH_NOT_FOUND", 404, "Vehículo no encontrado."); }
            tx.Commit();
            return (true, null, 204, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(
        int automovilId, string correo, int usuarioId, CancellationToken ct = default)
    {
        var esDuenio = await repo.EsDuenioAsync(automovilId, usuarioId);
        if (!esDuenio)
            return (false, "VEH_NOT_FOUND", 404, "Vehículo no encontrado o no pertenece al usuario.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var ok = await repo.SoftDeleteAsync(automovilId, correo, tx);
            if (!ok) { tx.Rollback(); return (false, "VEH_NOT_FOUND", 404, "Vehículo no encontrado."); }
            tx.Commit();
            return (true, null, 204, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(AutomovilListItemDto? Auto, string? Code, int Status, string? Detail)> CrearParaUsuarioAsync(
        AutomovilCrearAdminRequest req, string correoAdmin, int adminUserId, CancellationToken ct = default)
    {
        if (req.UsuarioId <= 0)
            return (null, "VEH_USUARIO_INVALIDO", 422, "El propietario (usuarioId) es obligatorio.");

        if (!await repo.UsuarioActivoAsync(req.UsuarioId, ct))
            return (null, "VEH_USUARIO_INVALIDO", 422, "El usuario propietario no existe o está inactivo.");

        if (string.IsNullOrWhiteSpace(req.Placas))
            return (null, "VEH_PLACAS_REQUERIDAS", 422, "Las placas son obligatorias.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var placas = req.Placas.Trim().ToUpperInvariant();
            var existe = await repo.ExistePlacaAsync(placas, null, tx);
            if (existe)
            {
                tx.Rollback();
                return (null, "VEH_PLACAS_DUPLICADAS", 409, $"Ya existe un vehículo con las placas '{placas}'.");
            }

            var crear = new AutomovilCrearRequest
            {
                MarcaId = req.MarcaId,
                ModeloId = req.ModeloId,
                ModeloLibre = req.ModeloLibre,
                Placas = placas,
                Color = req.Color,
            };
            var id = await repo.InsertAsync(crear, correoAdmin, req.UsuarioId, tx);
            tx.Commit();

            var padron = await repo.ListarPadronAsync(ct);
            var nuevo = padron.FirstOrDefault(a => a.AutomovilId == id);
            return (nuevo, null, 201, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarComoAdminAsync(
        int automovilId, AutomovilActualizarRequest req, string correoAdmin, CancellationToken ct = default)
    {
        if (!await repo.ExisteActivoAsync(automovilId, ct))
            return (false, "VEH_NOT_FOUND", 404, "Vehículo no encontrado.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            if (!string.IsNullOrWhiteSpace(req.Placas))
            {
                var existe = await repo.ExistePlacaAsync(req.Placas.Trim().ToUpperInvariant(), automovilId, tx);
                if (existe)
                {
                    tx.Rollback();
                    return (false, "VEH_PLACAS_DUPLICADAS", 409, $"Las placas '{req.Placas}' ya están en uso.");
                }
            }

            AutomovilActualizarRequest actualizar = req;
            if (req.Placas is not null)
            {
                actualizar = new AutomovilActualizarRequest
                {
                    MarcaId = req.MarcaId,
                    ModeloId = req.ModeloId,
                    ModeloLibre = req.ModeloLibre,
                    Placas = req.Placas.Trim().ToUpperInvariant(),
                    Color = req.Color,
                };
            }

            var ok = await repo.ActualizarAsync(automovilId, actualizar, correoAdmin, tx);
            if (!ok) { tx.Rollback(); return (false, "VEH_NOT_FOUND", 404, "Vehículo no encontrado."); }
            tx.Commit();
            return (true, null, 204, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarComoAdminAsync(
        int automovilId, string correoAdmin, CancellationToken ct = default)
    {
        if (!await repo.ExisteActivoAsync(automovilId, ct))
            return (false, "VEH_NOT_FOUND", 404, "Vehículo no encontrado.");

        if (db.State != ConnectionState.Open) db.Open();
        using var tx = db.BeginTransaction();
        try
        {
            var ok = await repo.SoftDeleteAsync(automovilId, correoAdmin, tx);
            if (!ok) { tx.Rollback(); return (false, "VEH_NOT_FOUND", 404, "Vehículo no encontrado."); }
            tx.Commit();
            return (true, null, 204, null);
        }
        catch
        {
            tx.Rollback();
            throw;
        }
    }

    public async Task<(MarcaDto? Data, string? Code, int Status, string? Detail)> CrearMarcaAsync(
        string marca, int adminId, string correo, CancellationToken ct = default)
    {
        var nombre = marca.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "MARCA_REQUERIDA", StatusCodes.Status400BadRequest, "El nombre de la marca es requerido.");

        try
        {
            var id = await repo.InsertMarcaAsync(nombre, correo, adminId);
            return (new MarcaDto { MarcaId = id, Marca = nombre }, null, StatusCodes.Status201Created, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "MARCA_DUPLICADA", StatusCodes.Status409Conflict, "Ya existe una marca con ese nombre.");
        }
    }

    public async Task<(MarcaDto? Data, string? Code, int Status, string? Detail)> ActualizarMarcaAsync(
        int marcaId, string marca, int adminId, string correo, CancellationToken ct = default)
    {
        var nombre = marca.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "MARCA_REQUERIDA", StatusCodes.Status400BadRequest, "El nombre de la marca es requerido.");

        try
        {
            var ok = await repo.UpdateMarcaAsync(marcaId, nombre, correo, adminId);
            if (!ok)
                return (null, "MARCA_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Marca no encontrada.");
            return (new MarcaDto { MarcaId = marcaId, Marca = nombre }, null, StatusCodes.Status200OK, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "MARCA_DUPLICADA", StatusCodes.Status409Conflict, "Ya existe una marca con ese nombre.");
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarMarcaAsync(
        int marcaId, int adminId, string correo, CancellationToken ct = default)
    {
        var ok = await repo.SoftDeleteMarcaAsync(marcaId, correo, adminId);
        if (!ok)
            return (false, "MARCA_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Marca no encontrada.");
        return (true, null, StatusCodes.Status204NoContent, null);
    }

    public async Task<(ModeloDto? Data, string? Code, int Status, string? Detail)> CrearModeloAsync(
        int marcaId, string modelo, int adminId, string correo, CancellationToken ct = default)
    {
        if (marcaId <= 0)
            return (null, "MODELO_MARCA_REQUERIDA", StatusCodes.Status400BadRequest, "La marca es requerida.");

        if (!await repo.ExisteMarcaActivaAsync(marcaId, ct))
            return (null, "MARCA_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Marca no encontrada.");

        var nombre = modelo.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "MODELO_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del modelo es requerido.");

        try
        {
            var id = await repo.InsertModeloAsync(marcaId, nombre, correo, adminId);
            return (new ModeloDto { ModeloId = id, Modelo = nombre, MarcaId = marcaId }, null, StatusCodes.Status201Created, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "MODELO_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe ese modelo para la marca seleccionada.");
        }
    }

    public async Task<(ModeloDto? Data, string? Code, int Status, string? Detail)> ActualizarModeloAsync(
        int modeloId, int marcaId, string modelo, int adminId, string correo, CancellationToken ct = default)
    {
        if (marcaId <= 0)
            return (null, "MODELO_MARCA_REQUERIDA", StatusCodes.Status400BadRequest, "La marca es requerida.");

        if (!await repo.ExisteMarcaActivaAsync(marcaId, ct))
            return (null, "MARCA_NO_ENCONTRADA", StatusCodes.Status404NotFound, "Marca no encontrada.");

        var nombre = modelo.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "MODELO_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del modelo es requerido.");

        try
        {
            var ok = await repo.UpdateModeloAsync(modeloId, marcaId, nombre, correo, adminId);
            if (!ok)
                return (null, "MODELO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Modelo no encontrado.");
            return (new ModeloDto { ModeloId = modeloId, Modelo = nombre, MarcaId = marcaId }, null, StatusCodes.Status200OK, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "MODELO_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe ese modelo para la marca seleccionada.");
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarModeloAsync(
        int modeloId, int adminId, string correo, CancellationToken ct = default)
    {
        var ok = await repo.SoftDeleteModeloAsync(modeloId, correo, adminId);
        if (!ok)
            return (false, "MODELO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Modelo no encontrado.");
        return (true, null, StatusCodes.Status204NoContent, null);
    }
}
