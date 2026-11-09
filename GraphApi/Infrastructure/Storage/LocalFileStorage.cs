using Microsoft.AspNetCore.StaticFiles;
using IOPath = System.IO.Path;

namespace GraphApi.Infrastructure.Storage;

public sealed class LocalFileStorage : IFileStorage
{
    private readonly string _baseDir;
    private static readonly FileExtensionContentTypeProvider _mime = new();

    public LocalFileStorage(IConfiguration config, IWebHostEnvironment env)
    {
        var rel = config["FileStorage:BasePath"] ?? "App_Data/archivos";
        _baseDir = IOPath.IsPathRooted(rel)
            ? rel
            : IOPath.Combine(env.ContentRootPath, rel);
        Directory.CreateDirectory(_baseDir);
    }

    public async Task<string> SaveAsync(Stream content, string fileName, string contentType, CancellationToken ct = default)
    {
        var ext = IOPath.GetExtension(fileName);
        var unique = $"{Guid.NewGuid():N}{ext}";
        var full = IOPath.Combine(_baseDir, unique);
        await using var fs = File.Create(full);
        await content.CopyToAsync(fs, ct);
        return unique; // ruta relativa
    }

    public Task<(Stream Content, string ContentType)> GetAsync(string ruta, CancellationToken ct = default)
    {
        var full = IOPath.Combine(_baseDir, ruta);
        if (!File.Exists(full))
            throw new FileNotFoundException("Archivo no encontrado.", ruta);

        var ext = IOPath.GetExtension(ruta);
        var mime = _mime.TryGetContentType(ext, out var ct2) ? ct2 : "application/octet-stream";
        Stream s = File.OpenRead(full);
        return Task.FromResult<(Stream, string)>((s, mime));
    }

    public Task DeleteAsync(string ruta, CancellationToken ct = default)
    {
        var full = IOPath.Combine(_baseDir, ruta);
        if (File.Exists(full)) File.Delete(full);
        return Task.CompletedTask;
    }
}
