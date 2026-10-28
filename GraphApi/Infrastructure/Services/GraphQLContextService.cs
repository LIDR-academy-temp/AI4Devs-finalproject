using Microsoft.AspNetCore.Http;

namespace GraphApi.Infrastructure.Services
{
    /// <inheritdoc />
    public sealed class GraphQLContextService : IGraphQLContextService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public GraphQLContextService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }

        /// <inheritdoc />
        public (int UserId, string WindowName) GetRequestContext()
        {
            var ctx = _httpContextAccessor.HttpContext
                ?? throw new GraphQLException("No hay contexto HTTP disponible.");

            // — UserID (obligatorio, entero)
            if (!ctx.Request.Headers.TryGetValue("UserID", out var vUserID) ||
                !int.TryParse(vUserID.FirstOrDefault(), out int nUserID))
            {
                throw new GraphQLException("Header 'UserID' ausente o inválido.");
            }

            // — WindowName (opcional, default "NoWindow")
            string windowName = ctx.Request.Headers.TryGetValue("WindowName", out var vWindowName)
                ? (string.IsNullOrWhiteSpace(vWindowName.FirstOrDefault()) ? "NoWindow" : vWindowName.FirstOrDefault()!)
                : "NoWindow";

            return (nUserID, windowName);
        }
    }
}
