using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;

namespace GraphApi.Infrastructure.RateLimiting;

public sealed class RateLimitingSettings
{
    public int WindowMinutes { get; init; }
    public int LoginPermitLimit { get; init; }
    public int QueueLimit { get; init; }
    public int GlobalPermitLimit { get; init; }
    public bool UseRequestContextPartitionKey { get; init; }

    public TimeSpan Window => TimeSpan.FromMinutes(WindowMinutes);

    public static RateLimitingSettings FromConfiguration(IConfiguration configuration, bool isDevelopment)
    {
        var rateLimitingSection = configuration.GetSection("RateLimiting");

        return new RateLimitingSettings
        {
            WindowMinutes = Math.Max(rateLimitingSection.GetValue("WindowMinutes", 1), 1),
            LoginPermitLimit = Math.Max(rateLimitingSection.GetValue("LoginPermitLimit", 5), 1),
            QueueLimit = Math.Max(rateLimitingSection.GetValue("QueueLimit", 0), 0),
            GlobalPermitLimit = Math.Max(
                rateLimitingSection.GetValue(
                    isDevelopment ? "DevelopmentGlobalPermitLimit" : "GlobalPermitLimit",
                    isDevelopment ? 600 : 100),
                1),
            UseRequestContextPartitionKey = isDevelopment &&
                rateLimitingSection.GetValue("PartitionByRequestContextInDevelopment", true)
        };
    }

    public string BuildPartitionKey(HttpContext context)
    {
        var remoteIp = context.Connection.RemoteIpAddress?.ToString() ?? "unknown";

        if (!UseRequestContextPartitionKey)
        {
            return remoteIp;
        }

        var userId = context.Request.Headers["UserID"].FirstOrDefault();
        var windowName = context.Request.Headers["WindowName"].FirstOrDefault();

        if (string.IsNullOrWhiteSpace(userId) && string.IsNullOrWhiteSpace(windowName))
        {
            return remoteIp;
        }

        return string.Join(':',
            remoteIp,
            string.IsNullOrWhiteSpace(userId) ? "nouser" : userId.Trim(),
            string.IsNullOrWhiteSpace(windowName) ? "nowindow" : windowName.Trim());
    }
}