using GraphApi.Models.ARC.CuartaArchivos;

namespace GraphApi.Services.ARC.CuartaArchivos;

public interface ICuartaArchivosService
{
    Task<IReadOnlyList<ArchivoListItemDto>> ListarAsync(string? tipoArchivo, CancellationToken ct = default);

    Task<IReadOnlyList<TipoArchivoItemDto>> ListarTiposAsync(CancellationToken ct = default);

    Task<(ArchivoListItemDto? Data, string? Code, int Status, string? Detail)> SubirAsync(
        IFormFile file,
        SubirArchivoRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(Stream? Content, string? ContentType, string? Nombre, string? Code, int Status, string? Detail)> DescargarAsync(
        int archivoId,
        int usuarioId,
        string correo,
        string? ua,
        string? ip,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarAsync(
        int archivoId,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(ArchivoListItemDto? Data, string? Code, int Status, string? Detail)> ActualizarAsync(
        int archivoId,
        ActualizarArchivoRequest request,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(TipoArchivoItemDto? Data, string? Code, int Status, string? Detail)> CrearTipoAsync(
        string tipoArchivo,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(TipoArchivoItemDto? Data, string? Code, int Status, string? Detail)> ActualizarTipoAsync(
        int tipoArchivoId,
        string tipoArchivo,
        int adminId,
        string correo,
        CancellationToken ct = default);

    Task<(bool Ok, string? Code, int Status, string? Detail)> EliminarTipoAsync(
        int tipoArchivoId,
        int adminId,
        string correo,
        CancellationToken ct = default);
}
