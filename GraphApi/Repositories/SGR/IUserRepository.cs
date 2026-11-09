using System.Data;
using GraphApi.Models.SGR.Auth;

namespace GraphApi.Repositories.SGR;

public interface IUserRepository
{
    Task<UserAuthRow?> FindByCorreoAsync(string correo, CancellationToken cancellationToken = default);

    Task<UserAuthRow?> FindByIdAsync(int usuarioId, CancellationToken cancellationToken = default);

    Task<bool> UpdatePasswordAsync(
        int usuarioId,
        string passwordHash,
        string modificadoPor,
        IDbTransaction tx);
}
