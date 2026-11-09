using System.Data;
using GraphApi.Models.NTF;

namespace GraphApi.Services.NTF;

public interface INotificacionService
{
    Task<NotificacionBandejaResponse> GetBandejaAsync(int usuarioId, int pagina, int tamano, CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status)> MarcarLeidaAsync(
        int notificacionId,
        int usuarioId,
        string correo,
        CancellationToken ct = default);

    Task<int> AvisoGeneralAsync(
        string titulo,
        string mensaje,
        NotificacionAutor autor,
        CancellationToken ct = default,
        int? condominioId = null);

    Task<int> NotificarUsuarioAsync(
        IDbTransaction tx,
        int usuarioId,
        string tipoNotificacion,
        string titulo,
        string mensaje,
        NotificacionAutor autor);

    Task<int> NotificarAdministradoresAsync(
        IDbTransaction tx,
        string tipoNotificacion,
        string titulo,
        string mensaje,
        NotificacionAutor autor);
}
