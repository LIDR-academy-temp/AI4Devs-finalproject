namespace GraphApi.Infrastructure.Models
{
    public sealed class ApiErrorResponse
    {
        public int StatusCode { get; init; }
        public string Message { get; init; } = string.Empty;
        public string TraceId { get; init; } = string.Empty;
        public IReadOnlyList<string> Errors { get; init; } = [];

        public static ApiErrorResponse Create(int statusCode, string message, string traceId, IEnumerable<string>? errors = null)
            => new()
            {
                StatusCode = statusCode,
                Message = message,
                TraceId = traceId,
                Errors = errors?.ToList().AsReadOnly() ?? (IReadOnlyList<string>)[]
            };
    }
}
