using GraphApi.Infrastructure;
using GraphApi.Infrastructure.Storage;
using GraphApi.Models.ARC.CuartaArchivos;
using GraphApi.Repositories.ARC;

namespace GraphApi.Services.ARC.CuartaArchivos;

public sealed class CuartaArchivosService : ICuartaArchivosService
{
    private readonly ICuartaArchivosRepository _repo;
    private readonly IFileStorage _storage;
    private readonly IUnitOfWork _uow;
    private const long MaxBytes = 5 * 1024 * 1024; // 5 MB (CA-3)

    private static readonly HashSet<string> AllowedMime = new(StringComparer.OrdinalIgnoreCase)
    {
        "application/pdf", "image/jpeg", "image/png", "image/webp",
        "application/msword",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    };

    public CuartaArchivosService(ICuartaArchivosRepository repo, IFileStorage storage, IUnitOfWork uow)
    {
        _repo = repo;
        _storage = storage;
        _uow = uow;
    }

    public Task<IReadOnlyList<ArchivoListItemDto>> ListarAsync(string? tipoArchivo, CancellationToken ct = default)
        => _repo.ListarAsync(tipoArchivo, ct);

    public Task<IReadOnlyList<TipoArchivoItemDto>> ListarTiposAsync(CancellationToken ct = default)
        => _repo.ListarTiposAsync(ct);

    public async Task<(ArchivoListItemDto? Data, string? Code, int Status, string? Detail)> SubirAsync(
        IFormFile file,
        SubirArchivoRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        if (file.Length > MaxBytes)
            return (null, "ARCHIVO_DEMASIADO_GRANDE", StatusCodes.Status413RequestEntityTooLarge, "El archivo supera el límite de 5 MB.");

        if (!AllowedMime.Contains(file.ContentType))
            return (null, "TIPO_NO_PERMITIDO", StatusCodes.Status415UnsupportedMediaType, "Tipo de archivo no permitido.");

        if (string.IsNullOrWhiteSpace(request.TipoArchivo))
            return (null, "TIPO_REQUERIDO", StatusCodes.Status400BadRequest, "El tipo de archivo es requerido.");

        var tx = _uow.BeginTransaction();
        try
        {
            var tipoId = await _repo.ResolverTipoArchivoIdAsync(request.TipoArchivo, tx);
            if (tipoId is null)
            {
                _uow.Rollback();
                return (null, "TIPO_NO_ENCONTRADO", StatusCodes.Status422UnprocessableEntity, $"El tipo de archivo '{request.TipoArchivo}' no existe.");
            }

            await using var stream = file.OpenReadStream();
            var ruta = await _storage.SaveAsync(stream, file.FileName, file.ContentType, ct);

            var nombre = string.IsNullOrWhiteSpace(request.Nombre) ? file.FileName : request.Nombre;
            var id = await _repo.InsertArchivoAsync(nombre, ruta, tipoId.Value, request.EsPrivado, correo, adminId, tx);

            _uow.Commit();

            var created = await _repo.ObtenerAsync(id, ct);
            return (created, null, StatusCodes.Status201Created, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(Stream? Content, string? ContentType, string? Nombre, string? Code, int Status, string? Detail)> DescargarAsync(
        int archivoId,
        int usuarioId,
        string correo,
        string? ua,
        string? ip,
        CancellationToken ct = default)
    {
        var archivo = await _repo.ObtenerAsync(archivoId, ct);
        if (archivo is null)
            return (null, null, null, "ARCHIVO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Archivo no encontrado.");

        try
        {
            var (stream, mime) = await _storage.GetAsync(archivo.Ruta, ct);
            // CA-1: registrar log (fuera de tx porque es auditoría best-effort)
            _ = _repo.InsertLogVisualizacionAsync(archivoId, usuarioId, correo, "Web", ip, ua);
            return (stream, mime, archivo.Nombre, null, StatusCodes.Status200OK, null);
        }
        catch (FileNotFoundException)
        {
            return (null, null, null, "ARCHIVO_NO_DISPONIBLE", StatusCodes.Status404NotFound, "El archivo físico no está disponible.");
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(
        int archivoId,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var existe = await _repo.ObtenerAsync(archivoId, ct);
        if (existe is null)
            return (false, "ARCHIVO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Archivo no encontrado.");

        var tx = _uow.BeginTransaction();
        try
        {
            var ok = await _repo.SoftDeleteAsync(archivoId, correo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (false, "ARCHIVO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Archivo no encontrado.");
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

    public async Task<(ArchivoListItemDto? Data, string? Code, int Status, string? Detail)> ActualizarAsync(
        int archivoId,
        ActualizarArchivoRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var nombre = request.Nombre.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "NOMBRE_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre es requerido.");

        if (string.IsNullOrWhiteSpace(request.TipoArchivo))
            return (null, "TIPO_REQUERIDO", StatusCodes.Status400BadRequest, "El tipo de archivo es requerido.");

        var existe = await _repo.ObtenerAsync(archivoId, ct);
        if (existe is null)
            return (null, "ARCHIVO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Archivo no encontrado.");

        var tx = _uow.BeginTransaction();
        try
        {
            var tipoId = await _repo.ResolverTipoArchivoIdAsync(request.TipoArchivo, tx);
            if (tipoId is null)
            {
                _uow.Rollback();
                return (null, "TIPO_NO_ENCONTRADO", StatusCodes.Status422UnprocessableEntity,
                    $"El tipo de archivo '{request.TipoArchivo}' no existe.");
            }

            var ok = await _repo.UpdateArchivoAsync(archivoId, nombre, tipoId.Value, request.EsPrivado, correo, adminId, tx);
            if (!ok)
            {
                _uow.Rollback();
                return (null, "ARCHIVO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Archivo no encontrado.");
            }

            _uow.Commit();
            var updated = await _repo.ObtenerAsync(archivoId, ct);
            return (updated, null, StatusCodes.Status200OK, null);
        }
        catch
        {
            _uow.Rollback();
            throw;
        }
    }

    public async Task<(TipoArchivoItemDto? Data, string? Code, int Status, string? Detail)> CrearTipoAsync(
        string tipoArchivo,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var nombre = tipoArchivo.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "TIPO_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del tipo es requerido.");

        try
        {
            var id = await _repo.InsertTipoAsync(nombre, correo, adminId);
            return (new TipoArchivoItemDto { TipoArchivoId = id, TipoArchivo = nombre }, null, StatusCodes.Status201Created, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number == 2627 || ex.Number == 2601)
        {
            return (null, "TIPO_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe un tipo con ese nombre.");
        }
    }

    public async Task<(TipoArchivoItemDto? Data, string? Code, int Status, string? Detail)> ActualizarTipoAsync(
        int tipoArchivoId,
        string tipoArchivo,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var nombre = tipoArchivo.Trim();
        if (string.IsNullOrEmpty(nombre))
            return (null, "TIPO_REQUERIDO", StatusCodes.Status400BadRequest, "El nombre del tipo es requerido.");

        try
        {
            var ok = await _repo.UpdateTipoAsync(tipoArchivoId, nombre, correo, adminId);
            if (!ok)
                return (null, "TIPO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo de archivo no encontrado.");
            return (new TipoArchivoItemDto { TipoArchivoId = tipoArchivoId, TipoArchivo = nombre }, null, StatusCodes.Status200OK, null);
        }
        catch (Microsoft.Data.SqlClient.SqlException ex) when (ex.Number == 2627 || ex.Number == 2601)
        {
            return (null, "TIPO_DUPLICADO", StatusCodes.Status409Conflict, "Ya existe un tipo con ese nombre.");
        }
    }

    public async Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarTipoAsync(
        int tipoArchivoId,
        int adminId,
        string correo,
        CancellationToken ct = default)
    {
        var ok = await _repo.SoftDeleteTipoAsync(tipoArchivoId, correo, adminId);
        if (!ok)
            return (false, "TIPO_NO_ENCONTRADO", StatusCodes.Status404NotFound, "Tipo de archivo no encontrado.");
        return (true, null, StatusCodes.Status204NoContent, null);
    }
}
