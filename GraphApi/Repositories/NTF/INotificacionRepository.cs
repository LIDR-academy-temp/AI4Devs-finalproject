using System.Data;
using GraphApi.Models.NTF;

namespace GraphApi.Repositories.NTF;

public interface INotificacionRepository
{
    Task<(IReadOnlyList<NotificacionItemDto> Items, int TotalNoLeidas)> GetBandejaAsync(
        int usuarioId,
        int pagina,
        int tamano,
        CancellationToken ct = default);

    Task<(bool Found, bool Owned)> GetPropiedadAsync(
        int notificacionId,
        int usuarioId,
        CancellationToken ct = default);

    Task MarcarLeidaAsync(int notificacionId, int usuarioId, string correo, CancellationToken ct = default);

    Task<int?> ResolveTipoIdAsync(string tipoNotificacion, IDbTransaction? tx = null);

    Task<int?> ResolveCanalTelegramIdAsync(IDbTransaction? tx = null);

    Task<int> NotificarUsuarioAsync(
        IDbTransaction tx,
        int usuarioId,
        int tipoNotificacionId,
        string titulo,
        string mensaje,
        NotificacionAutor autor);

    Task<int> NotificarPerfilAsync(
        IDbTransaction tx,
        string perfil,
        bool soloAdministradores,
        int tipoNotificacionId,
        string titulo,
        string mensaje,
        NotificacionAutor autor);
}
