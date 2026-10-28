using BC = BCrypt.Net.BCrypt;
using GraphApi.Infrastructure;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.SGR.Usuarios;
using GraphApi.Repositories.SGR;

namespace GraphApi.Services.SGR.Usuarios;

public sealed class CuartaUsuarioAdminService : ICuartaUsuarioAdminService
{
    private readonly IUsuarioAdminRepository _repo;
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly IPasswordGenerator _passwordGenerator;
    private readonly IUnitOfWork _uow;

    public CuartaUsuarioAdminService(
        IUsuarioAdminRepository repo,
        IRefreshTokenRepository refreshTokens,
        IPasswordGenerator passwordGenerator,
        IUnitOfWork uow)
    {
        _repo = repo;
        _refreshTokens = refreshTokens;
        _passwordGenerator = passwordGenerator;
        _uow = uow;
    }

    public async Task<(UsuarioCreadoDto? Data, string? Code, int Status, string? Detail)> CrearAsync(
        CrearUsuarioAdminRequest request,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var correo = request.Correo.Trim();
        if (await _repo.ExisteCorreoAsync(correo, ct))
        {
            return (null, "CONFLICT", StatusCodes.Status409Conflict, "El correo ya está en uso");
        }

        var perfilId = await _repo.ResolverPerfilIdAsync(request.Perfil.Trim(), ct);
        if (perfilId is null)
        {
            return (null, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Perfil no válido");
        }

        var passwordTemporal = _passwordGenerator.Generar(12);
        var hash = BC.HashPassword(passwordTemporal);

        var tx = _uow.BeginTransaction();
        try
        {
            if (request.CasaId.HasValue && !await _repo.CasaExisteAsync(request.CasaId.Value, tx))
            {
                _uow.Rollback();
                return (null, "NOT_FOUND", StatusCodes.Status404NotFound, "Casa no encontrada");
            }

            var usuarioId = await _repo.InsertUsuarioAsync(
                request.Nombre.Trim(),
                correo,
                string.IsNullOrWhiteSpace(request.Telefono) ? null : request.Telefono.Trim(),
                perfilId.Value,
                hash,
                adminCorreo,
                adminId,
                tx);

            if (request.CasaId.HasValue)
            {
                var esArrendatario = await _repo.TienePropietarioVigenteAsync(request.CasaId.Value, tx);
                var tipo = esArrendatario ? "Arrendatario" : "Propietario";

                if (await _repo.CasaOcupantesDisponibleAsync(tx))
                {
                    await _repo.InsertCasaOcupanteAsync(
                        request.CasaId.Value,
                        usuarioId,
                        tipo,
                        adminCorreo,
                        adminId,
                        tx);
                }

                if (tipo == "Propietario")
                {
                    await _repo.ActualizarPropietarioCasaAsync(
                        request.CasaId.Value,
                        usuarioId,
                        adminCorreo,
                        adminId,
                        tx);
                }
            }

            _uow.Commit();
            return (new UsuarioCreadoDto { UsuarioId = usuarioId, PasswordTemporal = passwordTemporal },
                null, StatusCodes.Status201Created, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public Task<IReadOnlyList<UsuarioPadronItemDto>> ListarPadronAsync(
        string? perfil,
        bool? bActivo,
        bool incluirEliminados,
        CancellationToken ct = default) =>
        _repo.ListarPadronAsync(perfil, bActivo, incluirEliminados, ct);

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> DesactivarAsync(
        int usuarioId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.SetActivoAsync(usuarioId, false, adminCorreo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, null);
            }

            await _refreshTokens.RevokeAllForUsuarioAsync(usuarioId, adminCorreo, tx);
            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> ActivarAsync(
        int usuarioId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.SetActivoAsync(usuarioId, true, adminCorreo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, null);
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

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(
        int usuarioId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.SoftDeleteAsync(usuarioId, adminCorreo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "NOT_FOUND", StatusCodes.Status404NotFound, null);
            }

            await _refreshTokens.RevokeAllForUsuarioAsync(usuarioId, adminCorreo, tx);
            _uow.Commit();
            return (true, null, StatusCodes.Status204NoContent, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> ActualizarAdminExtrasAsync(
        int usuarioId,
        string? perfil,
        int? casaId,
        int adminId,
        string adminCorreo,
        CancellationToken ct = default)
    {
        if (string.IsNullOrWhiteSpace(perfil) && !casaId.HasValue)
        {
            return (true, null, StatusCodes.Status200OK, null);
        }

        var tx = _uow.BeginTransaction();
        try
        {
            if (!string.IsNullOrWhiteSpace(perfil))
            {
                var perfilId = await _repo.ResolverPerfilIdAsync(perfil.Trim(), ct);
                if (perfilId is null)
                {
                    _uow.Rollback();
                    return (false, "VALIDATION_ERROR", StatusCodes.Status400BadRequest, "Perfil no válido");
                }

                var okPerfil = await _repo.ActualizarPerfilIdAsync(
                    usuarioId, perfilId.Value, adminCorreo, adminId, tx);
                if (!okPerfil)
                {
                    _uow.Rollback();
                    return (false, "NOT_FOUND", StatusCodes.Status404NotFound, null);
                }
            }

            if (casaId.HasValue)
            {
                if (!await _repo.CasaExisteAsync(casaId.Value, tx))
                {
                    _uow.Rollback();
                    return (false, "NOT_FOUND", StatusCodes.Status404NotFound, "Casa no encontrada");
                }

                var esArrendatario = await _repo.TienePropietarioVigenteAsync(casaId.Value, tx);
                var tipo = esArrendatario ? "Arrendatario" : "Propietario";

                if (await _repo.CasaOcupantesDisponibleAsync(tx))
                {
                    await _repo.InsertCasaOcupanteAsync(casaId.Value, usuarioId, tipo, adminCorreo, adminId, tx);
                }

                if (tipo == "Propietario")
                {
                    await _repo.ActualizarPropietarioCasaAsync(casaId.Value, usuarioId, adminCorreo, adminId, tx);
                }
            }

            _uow.Commit();
            return (true, null, StatusCodes.Status200OK, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }
}
