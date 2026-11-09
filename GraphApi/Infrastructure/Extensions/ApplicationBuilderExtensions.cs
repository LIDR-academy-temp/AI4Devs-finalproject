using GraphApi.Infrastructure.Middleware;

namespace GraphApi.Infrastructure.Extensions
{
    public static class ApplicationBuilderExtensions
    {
        public static WebApplication UseInfrastructure(this WebApplication app)
        {
            // Security headers — must come before any response is written
            app.Use(async (context, next) =>
            {
                context.Response.Headers["X-Content-Type-Options"] = "nosniff";
                context.Response.Headers["X-Frame-Options"] = "DENY";
                context.Response.Headers["Referrer-Policy"] = "strict-origin-when-cross-origin";
                context.Response.Headers["X-XSS-Protection"] = "1; mode=block";
                if (!app.Environment.IsDevelopment())
                {
                    context.Response.Headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains";
                }
                await next();
            });

            // Global exception handler — wraps everything below
            app.UseMiddleware<ExceptionHandlingMiddleware>();

            app.UseSwagger();
            app.UseSwaggerUI();

            if (!app.Environment.IsDevelopment())
            {
                app.UseHttpsRedirection();
            }

            app.UseCors("AllowConfigured");

            app.UseRateLimiter();

            app.UseAuthentication();
            app.UseAuthorization();

            app.MapControllers();
            app.MapGraphQL("/graphql");
            app.MapHealthChecks("/health");

            return app;
        }
    }
}