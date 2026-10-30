using GraphApi.Infrastructure;
using GraphApi.Models.ANM.Anuncios;
using GraphApi.Models.NTF;
using GraphApi.Repositories.ANM;
using GraphApi.Services.NTF;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Logging;

namespace GraphApi.Services.ANM.Anuncios;

public sealed class CuartaAnunciosService : ICuartaAnunciosService
{
    private readonly ICuartaAnunciosRepository _repo;
    private readonly IUnitOfWork _uow;
    private readonly INotificacionService _notificaciones;
    private readonly ILogger<CuartaAnunciosService> _logger;

    public CuartaAnunciosService(
        ICuartaAnunciosRepository repo,
        IUnitOfWork uow,
        INotificacionService notificaciones,
        ILogger<CuartaAnunciosService> logger)
    {
        _repo = repo;
        _uow = uow;
        _notificaciones = notificaciones;
        _logger = logger;
    }

    public Task<IReadOnlyList<AnuncioListItemDto>> ListarAsync(
        int usuarioId,
        bool incluirNoVigentes,
        CancellationToken ct = default) =>
        _repo.ListarAsync(usuarioId, incluirNoVigentes, ct);

    public Task<AnuncioListItemDto?> ObtenerAsync(
        int anuncioId,
        int usuarioId,
        bool soloVigentes,
        CancellationToken ct = default) =>
        _repo.ObtenerAsync(anuncioId, usuarioId, soloVigentes, ct);

    public async Task<(AnuncioListItemDto? Data, string? Code, int Status, string? Detail)> CrearAsync(
        AnuncioCrearRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            var tipoId = await _repo.ResolverTipoIdAsync(request.TipoAnuncio, tx);
            if (tipoId is null)
            {
                _uow.Rollback();
                return (null, "TIPO_ANUNCIO_INVALIDO", StatusCodes.Status400BadRequest, "Tipo de anuncio no válido");
            }

            var id = await _repo.InsertAsync(
                request.Titulo.Trim(),
                request.Contenido.Trim(),
                tipoId.Value,
                request.VigenteHasta,
                adminCorreo,
                adminId,
                tx);
            _uow.Commit();

            try
            {
                var mensaje = request.Contenido.Length > 500 ? request.Contenido[..500] : request.Contenido;
                await _notificaciones.AvisoGeneralAsync(
                    request.Titulo.Trim(),
                    mensaje,
                    new NotificacionAutor(adminId, adminCorreo),
                    ct);
            }
            catch (Exception ex)
            {
                _logger.LogWarning(ex, "AvisoGeneralAsync falló tras crear anuncio {AnuncioId}", id);
            }

            var created = await _repo.ObtenerAsync(id, adminId, false, ct);
            return (created, null, StatusCodes.Status201Created, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(AnuncioListItemDto? Data, string? Code, int Status, string? Detail)> ActualizarAsync(
        int anuncioId,
        AnuncioActualizarRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            int? tipoId = null;
            if (!string.IsNullOrWhiteSpace(request.TipoAnuncio))
            {
                tipoId = await _repo.ResolverTipoIdAsync(request.TipoAnuncio, tx);
                if (tipoId is null)
                {
                    _uow.Rollback();
                    return (null, "TIPO_ANUNCIO_INVALIDO", StatusCodes.Status400BadRequest, "Tipo de anuncio no válido");
                }
            }

            var ok = await _repo.UpdateAsync(
                anuncioId,
                request.Titulo?.Trim(),
                request.Contenido?.Trim(),
                tipoId,
                request.VigenteHasta,
                request.VigenteHastaEspecificado,
                adminCorreo,
                adminId,
                tx);
            if (!ok)
            {
                _uow.Rollback();
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Anuncio no encontrado");
            }

            _uow.Commit();
            var updated = await _repo.ObtenerAsync(anuncioId, adminId, soloVigentes: false, ct);
            return (updated, null, StatusCodes.Status200OK, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(
        int anuncioId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.SoftDeleteAsync(anuncioId, adminCorreo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Anuncio no encontrado");
            }

            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> MarcarVistoAsync(
        int anuncioId,
        int usuarioId,
        string correo,
        CancellationToken ct = default)
    {
        if (!await _repo.AnuncioVigenteAsync(anuncioId, ct))
        {
            return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Anuncio no disponible");
        }

        var tx = _uow.BeginTransaction();
        try
        {
            await _repo.MarcarVistoAsync(anuncioId, usuarioId, correo, tx);
            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public Task<IReadOnlyList<TipoAnuncioItemDto>> ListarTiposAsync(CancellationToken ct = default) =>
        _repo.ListarTiposAsync(ct);

    public async Task<(TipoAnuncioItemDto? Data, string? Code, int Status, string? Detail)> CrearTipoAsync(
        string tipoAnuncio, int adminId, string correo, CancellationToken ct = default)
    {
        var nombre = tipoAnuncio.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "TIPO_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del tipo es requerido.");

        try
        {
            var id = await _repo.InsertTipoAsync(nombre, correo, adminId);
            return (new TipoAnuncioItemDto { TipoAnuncioId = id, TipoAnuncio = nombre }, null, StatusCodes.Status201Created, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "TIPO_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe un tipo con ese nombre.");
        }
    }

    public async Task<(TipoAnuncioItemDto? Data, string? Code, int Status, string? Detail)> ActualizarTipoAsync(
        int tipoAnuncioId, string tipoAnuncio, int adminId, string correo, CancellationToken ct = default)
    {
        var nombre = tipoAnuncio.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "TIPO_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del tipo es requerido.");

        try
        {
            var ok = await _repo.UpdateTipoAsync(tipoAnuncioId, nombre, correo, adminId);
            if (!ok)
                return (null, "TIPO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo de anuncio no encontrado.");
            return (new TipoAnuncioItemDto { TipoAnuncioId = tipoAnuncioId, TipoAnuncio = nombre }, null, StatusCodes.Status200OK, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number is 2627 or 2601)
        {
            return (null, "TIPO_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe un tipo con ese nombre.");
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarTipoAsync(
        int tipoAnuncioId, int adminId, string correo, CancellationToken ct = default)
    {
        var enUso = await _repo.ContarAnunciosPorTipoIdAsync(tipoAnuncioId, ct);
        if (enUso > 0)
            return (false, "TIPO_EN_USO", StatusCodes.Status409Conflict, "No se puede eliminar: hay anuncios que usan este tipo.");

        var ok = await _repo.SoftDeleteTipoAsync(tipoAnuncioId, correo, adminId);
        if (!ok)
            return (false, "TIPO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo de anuncio no encontrado.");
        return (true, null, StatusCodes.Status204NoContent, null);
    }
}
