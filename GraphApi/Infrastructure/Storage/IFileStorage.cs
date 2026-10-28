namespace GraphApi.Infrastructure.Storage;

public interface IFileStorage
{
    /// <summary>Guarda el stream; devuelve la ruta relativa almacenada.</summary>
    Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken ct = default);

    /// <summary>Devuelve (stream, contentType) para un archivo existente por ruta relativa.</summary>
    Task<(Stream Content, string ContentType)> GetAsync(string ruta, CancellationToken ct = default);

    /// <summary>Elimina físicamente el archivo (se llama solo cuando se hace hard-delete, que no aplica en Cuarta).</summary>
    Task DeleteAsync(string ruta, CancellationToken ct = default);
}
