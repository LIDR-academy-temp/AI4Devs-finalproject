using System.Data;
using GraphApi.Infrastructure;
using GraphApi.Models.NTF;
using GraphApi.Repositories.NTF;

namespace GraphApi.Services.NTF;

public sealed class NotificacionService : INotificacionService
{
    private readonly INotificacionRepository _repo;
    private readonly IUnitOfWork _uow;

    public NotificacionService(INotificacionRepository repo, IUnitOfWork uow)
    {
        _repo = repo;
        _uow = uow;
    }

    public async Task<NotificacionBandejaResponse> GetBandejaAsync(
        int usuarioId,
        int pagina,
        int tamano,
        CancellationToken ct = default)
    {
        pagina = Math.Max(1, pagina);
        tamano = Math.Clamp(tamano, 1, 100);

        var (items, totalNoLeidas) = await _repo.GetBandejaAsync(usuarioId, pagina, tamano, ct);
        return new NotificacionBandejaResponse
        {
            Items = items,
            Pagina = pagina,
            Tamano = tamano,
            TotalNoLeidas = totalNoLeidas,
        };
    }

    public async Task<(bool Ok, string? Code, int Status)> MarcarLeidaAsync(
        int notificacionId,
        int usuarioId,
        string correo,
        CancellationToken ct = default)
    {
        var (found, owned) = await _repo.GetPropiedadAsync(notificacionId, usuarioId, ct);
        if (!found)
        {
            return (false, "NOT_FOUND", StatusCodes.Status404NotFound);
        }

        if (!owned)
        {
            return (false, "FORBIDDEN", StatusCodes.Status403Forbidden);
        }

        await _repo.MarcarLeidaAsync(notificacionId, usuarioId, correo, ct);
        return (true, null, StatusCodes.Status204NoContent);
    }

    public async Task<int> AvisoGeneralAsync(
        string titulo,
        string mensaje,
        NotificacionAutor autor,
        CancellationToken ct = default,
        int? condominioId = null)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            var count = await NotificarResidentesAsync(tx, "AVISO_GENERAL", titulo, mensaje, autor, condominioId);
            _uow.Commit();
            return count;
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<int> NotificarUsuarioAsync(
        IDbTransaction tx,
        int usuarioId,
        string tipoNotificacion,
        string titulo,
        string mensaje,
        NotificacionAutor autor)
    {
        var tipoId = await ResolveTipoAsync(tipoNotificacion, tx);
        return await _repo.NotificarUsuarioAsync(tx, usuarioId, tipoId, titulo, mensaje, autor);
    }

    public async Task<int> NotificarAdministradoresAsync(
        IDbTransaction tx,
        string tipoNotificacion,
        string titulo,
        string mensaje,
        NotificacionAutor autor)
    {
        var tipoId = await ResolveTipoAsync(tipoNotificacion, tx);
        return await _repo.NotificarPerfilAsync(
            tx,
            perfil: string.Empty,
            soloAdministradores: true,
            tipoId,
            titulo,
            mensaje,
            autor);
    }

    private async Task<int> NotificarResidentesAsync(
        IDbTransaction tx,
        string tipoNotificacion,
        string titulo,
        string mensaje,
        NotificacionAutor autor,
        int? condominioId = null)
    {
        var tipoId = await ResolveTipoAsync(tipoNotificacion, tx);
        return await _repo.NotificarPerfilAsync(
            tx,
            perfil: "Residente",
            soloAdministradores: false,
            tipoId,
            titulo,
            mensaje,
            autor,
            condominioId);
    }

    private async Task<int> ResolveTipoAsync(string tipoNotificacion, IDbTransaction tx)
    {
        var tipoId = await _repo.ResolveTipoIdAsync(tipoNotificacion, tx);
        if (tipoId is null)
        {
            throw new InvalidOperationException($"Tipo de notificación desconocido: {tipoNotificacion}");
        }

        return tipoId.Value;
    }
}
