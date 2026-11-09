namespace GraphApi.Infrastructure.Common;

/// <summary>
/// Resultado de operación de dominio (readme §2.5 — mapeo HTTP vía <see cref="ResultActionResults"/>).
/// </summary>
public sealed class Result
{
    public bool IsSuccess { get; init; }
    public string Code { get; init; } = string.Empty;
    public string Detail { get; init; } = string.Empty;

    public static Result Ok() => new() { IsSuccess = true };

    public static Result Fail(string code, string detail) =>
        new() { IsSuccess = false, Code = code, Detail = detail };
}
