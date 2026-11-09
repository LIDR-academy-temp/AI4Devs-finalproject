using GraphApi.Infrastructure.Extensions;
using Serilog;

Log.Logger = new LoggerConfiguration()
    .WriteTo.Console()
    .CreateBootstrapLogger();

try
{
    var builder = WebApplication.CreateBuilder(args);

    builder.Host.UseSerilog((ctx, services, config) =>
        config.ReadFrom.Configuration(ctx.Configuration)
              .ReadFrom.Services(services)
              .Enrich.FromLogContext());

    // Registra TODO (JWT, Dapper, Swagger, GraphQL, controllers, servicios…)
    builder.AddInfrastructureServices();

    var app = builder.Build();

    // Configura pipeline (Swagger, Auth, Controllers, GraphQL…)
    app.UseInfrastructure();

    app.Run();
}
catch (Exception ex)
{
    Log.Fatal(ex, "Application terminated unexpectedly");
    throw;
}
finally
{
    Log.CloseAndFlush();
}

public partial class Program;