using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Hosting;

namespace GraphApi.Infrastructure.RequestContext
{
    public sealed class HttpRequestContextAccessor : IRequestContextAccessor
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public HttpRequestContextAccessor(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        public RequestContextData GetRequiredContext()
        {
            var httpContext = _httpContextAccessor.HttpContext
                ?? throw new InvalidOperationException("No hay contexto HTTP disponible.");

            var request = httpContext.Request;
            var isGetRequest = HttpMethods.IsGet(request.Method);
            var isDevelopment = httpContext.RequestServices
                .GetService(typeof(IHostEnvironment)) is IHostEnvironment hostEnvironment &&
                hostEnvironment.IsDevelopment();

            var userId = 0;
            if (request.Headers.TryGetValue("UserID", out var userHeader) &&
                int.TryParse(userHeader.FirstOrDefault(), out var parsedUserId))
            {
                userId = parsedUserId;
            }

            var windowName = request.Headers["WindowName"].FirstOrDefault();

            if (userId <= 0)
            {
                if (isDevelopment || isGetRequest)
                {
                    userId = 1;
                }
                else
                {
                    throw new InvalidOperationException("Header 'UserID' ausente o inválido.");
                }
            }

            if (string.IsNullOrWhiteSpace(windowName))
            {
                if (isDevelopment || isGetRequest)
                {
                    windowName = "SwaggerUI";
                }
                else
                {
                    throw new InvalidOperationException("Header 'WindowName' ausente o vacío.");
                }
            }

            var environmentKey = request.Headers["Environment"].FirstOrDefault() ?? "Default";

            return new RequestContextData
            {
                EnvironmentKey = string.IsNullOrWhiteSpace(environmentKey) ? "Default" : environmentKey,
                UserId = userId,
                WindowName = windowName!.Trim()
            };
        }

        public RequestContextData GetOptionalContext()
        {
            var httpContext = _httpContextAccessor.HttpContext;
            if (httpContext is null)
            {
                return new RequestContextData();
            }

            var request = httpContext.Request;
            var environmentKey = request.Headers["Environment"].FirstOrDefault() ?? "Default";

            var userId = 0;
            if (request.Headers.TryGetValue("UserID", out var userHeader))
            {
                int.TryParse(userHeader.FirstOrDefault(), out userId);
            }

            var windowName = request.Headers["WindowName"].FirstOrDefault() ?? "NoWindow";

            return new RequestContextData
            {
                EnvironmentKey = string.IsNullOrWhiteSpace(environmentKey) ? "Default" : environmentKey,
                UserId = userId,
                WindowName = string.IsNullOrWhiteSpace(windowName) ? "NoWindow" : windowName.Trim()
            };
        }
    }
}