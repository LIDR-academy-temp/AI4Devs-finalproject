using GraphApi.Infrastructure;
using GraphApi.Models.SGR.Casas;
using GraphApi.Repositories.SGR;

namespace GraphApi.Services.SGR.Casas;

public sealed class CuartaCasasService : ICuartaCasasService
{
    private readonly ICasasCuartaRepository _repo;
    private readonly IUnitOfWork _uow;

    public CuartaCasasService(ICasasCuartaRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public Task<IReadOnlyList<CondominioItemDto>> ListarCondominiosAsync(CancellationToken ct = default) =>
        _repo.ListarCondominiosAsync(ct);

    public Task<IReadOnlyList<CasaListItemDto>> ListarCasasAsync(
        int? condominioId,
        string? numero,
        bool incluirEliminados,
        CancellationToken ct = default) =>
        _repo.ListarCasasAsync(condominioId, numero, incluirEliminados, ct);

    public Task<CasaListItemDto?> ObtenerCasaAsync(int casaId, CancellationToken ct = default) =>
        _repo.ObtenerCasaAsync(casaId, ct);

    public async Task<(CasaListItemDto? Data, string? Code, int Status, string? Detail)> CrearAsync(
        CasaCrearRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            if (!await _repo.CondominioExisteAsync(request.CondominioId, tx))
            {
                _uow.Rollback();
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Condominio no encontrado");
            }

            if (request.PropietarioUsuarioId is int uid && !await _repo.UsuarioExisteAsync(uid, tx))
            {
                _uow.Rollback();
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Propietario no encontrado");
            }

            var id = await _repo.InsertCasaAsync(
                request.CondominioId,
                request.Direccion.Trim(),
                request.Numero.Trim(),
                request.PropietarioUsuarioId,
                adminCorreo,
                adminId,
                tx);

            _uow.Commit();
            var created = await _repo.ObtenerCasaAsync(id, ct);
            return (created, null, StatusCodes.Status201Created, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(CasaListItemDto? Data, string? Code, int Status, string? Detail)> ActualizarAsync(
        int casaId,
        CasaActualizarRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            var existing = await _repo.ObtenerCasaPorIdAsync(casaId, tx, ct);
            if (existing is null)
            {
                _uow.Rollback();
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Casa no encontrada");
            }

            if (request.PropietarioUsuarioId is int uid && !await _repo.UsuarioExisteAsync(uid, tx))
            {
                _uow.Rollback();
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Propietario no encontrado");
            }

            var ok = await _repo.UpdateCasaAsync(
                casaId,
                request.Direccion?.Trim(),
                request.Numero?.Trim(),
                request.PropietarioUsuarioId,
                adminCorreo,
                adminId,
                tx);

            if (!ok)
            {
                _uow.Rollback();
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Casa no encontrada");
            }

            _uow.Commit();
            var updated = await _repo.ObtenerCasaAsync(casaId, ct);
            return (updated, null, StatusCodes.Status200OK, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(
        int casaId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            if (await _repo.TieneOcupanteVigenteAsync(casaId, tx)
                || await _repo.TieneCuotasActivasAsync(casaId, tx))
            {
                _uow.Rollback();
                return (false, "CONFLICT", StatusCodes.Status409Conflict,
                    "No se puede eliminar la casa con ocupantes o cuotas pendientes");
            }

            var ok = await _repo.SoftDeleteCasaAsync(casaId, adminCorreo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Casa no encontrada");
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
}
