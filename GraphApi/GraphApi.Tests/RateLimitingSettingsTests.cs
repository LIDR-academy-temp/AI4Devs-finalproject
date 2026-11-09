using System.Net;
using GraphApi.Infrastructure.RateLimiting;
using Microsoft.AspNetCore.Http;
using Microsoft.Extensions.Configuration;
using Xunit;

namespace GraphApi.Tests;

public class RateLimitingSettingsTests
{
    [Fact]
    public void FromConfiguration_UsesDevelopmentDefaults_WhenValuesAreMissing()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>())
            .Build();

        var settings = RateLimitingSettings.FromConfiguration(configuration, isDevelopment: true);

        Assert.Equal(1, settings.WindowMinutes);
        Assert.Equal(5, settings.LoginPermitLimit);
        Assert.Equal(0, settings.QueueLimit);
        Assert.Equal(600, settings.GlobalPermitLimit);
        Assert.True(settings.UseRequestContextPartitionKey);
    }

    [Fact]
    public void FromConfiguration_UsesConfiguredOverrides()
    {
        var configuration = new ConfigurationBuilder()
            .AddInMemoryCollection(new Dictionary<string, string?>
            {
                ["RateLimiting:WindowMinutes"] = "2",
                ["RateLimiting:LoginPermitLimit"] = "9",
                ["RateLimiting:QueueLimit"] = "3",
                ["RateLimiting:DevelopmentGlobalPermitLimit"] = "750",
                ["RateLimiting:PartitionByRequestContextInDevelopment"] = "false"
            })
            .Build();

        var settings = RateLimitingSettings.FromConfiguration(configuration, isDevelopment: true);

        Assert.Equal(2, settings.WindowMinutes);
        Assert.Equal(9, settings.LoginPermitLimit);
        Assert.Equal(3, settings.QueueLimit);
        Assert.Equal(750, settings.GlobalPermitLimit);
        Assert.False(settings.UseRequestContextPartitionKey);
    }

    [Fact]
    public void BuildPartitionKey_UsesRemoteIpOnly_WhenRequestContextPartitioningIsDisabled()
    {
        var settings = new RateLimitingSettings
        {
            WindowMinutes = 1,
            LoginPermitLimit = 5,
            QueueLimit = 0,
            GlobalPermitLimit = 100,
            UseRequestContextPartitionKey = false
        };
        var context = CreateHttpContext("127.0.0.1", userId: "12", windowName: "web");

        var partitionKey = settings.BuildPartitionKey(context);

        Assert.Equal("127.0.0.1", partitionKey);
    }

    [Fact]
    public void BuildPartitionKey_UsesUserAndWindow_WhenRequestContextPartitioningIsEnabled()
    {
        var settings = new RateLimitingSettings
        {
            WindowMinutes = 1,
            LoginPermitLimit = 5,
            QueueLimit = 0,
            GlobalPermitLimit = 600,
            UseRequestContextPartitionKey = true
        };
        var context = CreateHttpContext("127.0.0.1", userId: "12", windowName: "web");

        var partitionKey = settings.BuildPartitionKey(context);

        Assert.Equal("127.0.0.1:12:web", partitionKey);
    }

    [Fact]
    public void BuildPartitionKey_FallsBackToRemoteIp_WhenHeadersAreMissing()
    {
        var settings = new RateLimitingSettings
        {
            WindowMinutes = 1,
            LoginPermitLimit = 5,
            QueueLimit = 0,
            GlobalPermitLimit = 600,
            UseRequestContextPartitionKey = true
        };
        var context = CreateHttpContext("127.0.0.1");

        var partitionKey = settings.BuildPartitionKey(context);

        Assert.Equal("127.0.0.1", partitionKey);
    }

    private static DefaultHttpContext CreateHttpContext(string remoteIp, string? userId = null, string? windowName = null)
    {
        var context = new DefaultHttpContext();
        context.Connection.RemoteIpAddress = IPAddress.Parse(remoteIp);

        if (!string.IsNullOrWhiteSpace(userId))
        {
            context.Request.Headers["UserID"] = userId;
        }

        if (!string.IsNullOrWhiteSpace(windowName))
        {
            context.Request.Headers["WindowName"] = windowName;
        }

        return context;
    }
}