using GraphApi.Infrastructure.Models;
using FluentValidation;
using Microsoft.AspNetCore.Http;
using System.Text.Json;

namespace GraphApi.Infrastructure.Middleware
{
    public class ExceptionHandlingMiddleware
    {
        private readonly RequestDelegate _next;
        private readonly ILogger<ExceptionHandlingMiddleware> _logger;
        private readonly IHostEnvironment _env;

        public ExceptionHandlingMiddleware(
            RequestDelegate next,
            ILogger<ExceptionHandlingMiddleware> logger,
            IHostEnvironment env)
        {
            _next = next;
            _logger = logger;
            _env = env;
        }

        public async Task InvokeAsync(HttpContext context)
        {
            try
            {
                await _next(context);
            }
            catch (ValidationException ex)
            {
                var errors = ex.Errors.Select(e => e.ErrorMessage).ToList();
                _logger.LogWarning("Validation failed for {Path}: {Errors}",
                    context.Request.Path, string.Join("; ", errors));
                await WriteErrorAsync(context, StatusCodes.Status400BadRequest,
                    "Datos de entrada inválidos.", errors);
            }
            catch (UnauthorizedAccessException ex)
            {
                _logger.LogWarning("Unauthorized access attempt on {Path}: {Message}",
                    context.Request.Path, ex.Message);
                await WriteErrorAsync(context, StatusCodes.Status401Unauthorized,
                    "No autorizado.");
            }
            catch (System.Collections.Generic.KeyNotFoundException ex)
            {
                _logger.LogInformation("Resource not found on {Path}: {Message}",
                    context.Request.Path, ex.Message);
                await WriteErrorAsync(context, StatusCodes.Status404NotFound,
                    "Recurso no encontrado.");
            }
            catch (InvalidOperationException ex)
            {
                _logger.LogWarning("Invalid operation on {Path}: {Message}",
                    context.Request.Path, ex.Message);
                await WriteErrorAsync(context, StatusCodes.Status400BadRequest,
                    ex.Message);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Unhandled exception on {Path}", context.Request.Path);
                // Never expose internal details in production
                var message = _env.IsDevelopment()
                    ? ex.Message
                    : "Ocurrió un error interno. Por favor intente más tarde.";
                await WriteErrorAsync(context, StatusCodes.Status500InternalServerError, message);
            }
        }

        private static async Task WriteErrorAsync(
            HttpContext context,
            int statusCode,
            string message,
            IEnumerable<string>? errors = null)
        {
            context.Response.StatusCode = statusCode;
            context.Response.ContentType = "application/json";

            var traceId = context.TraceIdentifier;
            var response = ApiErrorResponse.Create(statusCode, message, traceId, errors);

            var json = JsonSerializer.Serialize(response, new JsonSerializerOptions
            {
                PropertyNamingPolicy = JsonNamingPolicy.CamelCase
            });
            await context.Response.WriteAsync(json);
        }
    }
}
