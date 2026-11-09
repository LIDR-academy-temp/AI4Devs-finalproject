using GraphApi.Infrastructure;
using GraphApi.Models.SGR.Usuarios;
using GraphApi.Repositories.SGR;

namespace GraphApi.Services.SGR.Usuarios;

public sealed class UsuarioPerfilService : IUsuarioPerfilService
{
    private readonly IUsuarioPerfilRepository _perfil;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IUnitOfWork _uow;

    public UsuarioPerfilService(
        IUsuarioPerfilRepository perfil,
        IRefreshTokenRepository refreshTokens,
        IUnitOfWork uow)
    {
        _perfil = perfil;
        _refreshTokens = refreshTokens;
        _uow = uow;
    }

    public async Task<(PerfilDto? Data, string? Code, int Status, string? Detail)> ObtenerAsync(
        int id,
        int callerId,
        bool callerEsAdmin,
        CancellationToken ct = default)
    {
        if (!callerEsAdmin && id != callerId)
        {
            return (null, "FORBIDDEN", StatusCodes.Status403Forbidden, null);
        }

        var dto = await _perfil.ObtenerAsync(id, ct);
        if (dto is null)
        {
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, null);
        }

        return (dto, null, StatusCodes.Status200OK, null);
    }

    public async Task<(PerfilDto? Data, string? Code, int Status, string? Detail)> ActualizarAsync(
        int id,
        ActualizarPerfilRequest request,
        int callerId,
        bool callerEsAdmin,
        string callerCorreo,
        CancellationToken ct = default)
    {
        if (!callerEsAdmin && id != callerId)
        {
            return (null, "FORBIDDEN", StatusCodes.Status403Forbidden, null);
        }

        var actual = await _perfil.ObtenerAsync(id, ct);
        if (actual is null)
        {
            return (null, "NOT_FOUND", StatusCodes.Status404NotFound, null);
        }

        var correoNormalizado = request.Correo.Trim();
        if (await _perfil.ExisteCorreoOtroUsuarioAsync(id, correoNormalizado, ct))
        {
            return (null, "CONFLICT", StatusCodes.Status409Conflict, "El correo ya está en uso");
        }

        var nombre = callerEsAdmin && !string.IsNullOrWhiteSpace(request.Nombre)
            ? request.Nombre.Trim()
            : null;

        if (!callerEsAdmin && nombre is not null)
        {
            nombre = null;
        }

        var correoCambio = !string.Equals(actual.Correo, correoNormalizado, StringComparison.OrdinalIgnoreCase);

        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _perfil.ActualizarAsync(
                id,
                correoNormalizado,
                string.IsNullOrWhiteSpace(request.Telefono) ? null : request.Telefono.Trim(),
                nombre,
                callerCorreo,
                callerId,
                tx);

            if (!ok)
            {
                _uow.Rollback();
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, null);
            }

            if (correoCambio)
            {
                await _refreshTokens.RevokeAllForUsuarioAsync(id, callerCorreo, tx);
            }

            _uow.Commit();
        }
        catch
        {
            _uow.Rollback();
            throw;
        }

        var updated = await _perfil.ObtenerAsync(id, ct);
        if (updated is not null && correoCambio)
        {
            updated.RequiereReLogin = true;
        }

        return (updated, null, StatusCodes.Status200OK, null);
    }
}
