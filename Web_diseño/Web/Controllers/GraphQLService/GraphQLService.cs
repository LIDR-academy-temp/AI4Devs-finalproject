using System.Net;
using System.Net.Http.Headers;
using System.Text;
using System.Text.Json;
using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

public static class GraphQLService
{
    // ====== Config ======
    private static string _endpoint = "https://apicuartaquinientos.runasp.net/graphql/";
    private static string? _user;  // para generar token
    private static string? _pass;  // para generar token
    private static int _refreshSkewSeconds = 90;
    private static IHttpContextAccessor? _httpContextAccessor;

    // Headers personalizados opcionales
    private static string? _defaultUserId;
    private static string? _defaultWindowName;

    // ====== Estado ======
    private static readonly HttpClient _http = new() { Timeout = TimeSpan.FromSeconds(100) };
    private static readonly JsonSerializerOptions _json = new()
    {
        PropertyNameCaseInsensitive = true,
        DefaultIgnoreCondition = JsonIgnoreCondition.WhenWritingNull
    };
    private static readonly SemaphoreSlim _lock = new(1, 1);

    private static string? _token;
    private static DateTimeOffset? _expiresUtc;

    // ====== Config pública ======

    /// <summary>
    /// Configura endpoint y, si quieres que el servicio GENERE token, pasa user/pass.
    /// </summary>
    public static void Configure(string endpoint, string? user = null, string? pass = null, int refreshSkewSeconds = 90)
    {
        _endpoint = endpoint;
        _user = user;
        _pass = pass;
        _refreshSkewSeconds = refreshSkewSeconds;
        Reset();
    }

    /// <summary>
    /// Habilita la lectura del token backend desde el contexto HTTP del portal.
    /// </summary>
    public static void SetHttpContextAccessor(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    /// <summary>Define UserID/WindowName que se enviarán por default en cada request.</summary>
    public static void ConfigureContext(string? defaultUserId, string? defaultWindowName)
    {
        _defaultUserId = defaultUserId;
        _defaultWindowName = defaultWindowName;
    }

    /// <summary>
    /// Inyecta un JWT (por ejemplo el que me compartiste) y opcionalmente su expiración.
    /// Si no pasas expiración, asumo 8h para no forzar refresh.
    /// </summary>
    public static void SetBearer(string jwt, DateTimeOffset? expiresUtc = null)
    {
        _token = jwt;
        _expiresUtc = expiresUtc ?? DateTimeOffset.UtcNow.AddHours(8);
    }

    /// <summary>Olvida token/expiración cacheados.</summary>
    public static void Reset()
    {
        _token = null;
        _expiresUtc = null;
    }

    // ====== API principal ======

    /// <summary>
    /// Ejecuta una operación GraphQL (query o mutation).
    /// Si no hay token válido y tienes user/pass, genera token con getgenerarToken.
    /// Lanza InvalidOperationException con detalle si hay errors[] o la respuesta no contiene "data".
    /// </summary>
    public static async Task<TData> SendAsync<TData>(
        string operation,
        object? variables = null,
        string? operationName = null,
        string? userId = null,
        string? windowName = null,
        CancellationToken ct = default)
        where TData : class
    {
        await EnsureValidTokenAsync(userId, windowName, ct);

        var payload = new GraphQLRequest
        {
            Query = operation,
            Variables = variables,
            OperationName = string.IsNullOrWhiteSpace(operationName) ? null : operationName
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, _endpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, _json), Encoding.UTF8, "application/json")
        };

        if (!string.IsNullOrWhiteSpace(_token))
            req.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _token);

        ApplyCustomHeaders(req, userId, windowName);

        using var resp = await _http.SendAsync(req, ct);
        var body = await resp.Content.ReadAsStringAsync(ct);
        try
        {
            var logDir = System.IO.Path.Combine(Directory.GetCurrentDirectory(), "tmp");
            System.IO.Directory.CreateDirectory(logDir);
            var logPath = System.IO.Path.Combine(logDir, "debug_graphql_responses.log");
            var entry = $"{DateTime.UtcNow:O} | OperationName={(operationName ?? "none")} | userId={(userId ?? _defaultUserId)} | windowName={(windowName ?? _defaultWindowName)} | Status={(int)resp.StatusCode} {resp.ReasonPhrase} | Body={body}{Environment.NewLine}";
            System.IO.File.AppendAllText(logPath, entry);
        }
        catch { }

        GraphQLResponse<TData>? parsed = null;
        try { parsed = JsonSerializer.Deserialize<GraphQLResponse<TData>>(body, _json); } catch { /* puede no parsear si hubo error HTTP ajeno a GraphQL */ }

        if (parsed?.Errors is { Length: > 0 })
        {
            var msgs = string.Join(" | ", parsed.Errors.Select(e => e.Message));
            throw new InvalidOperationException($"GraphQL errors: {msgs}\nRaw: {body}");
        }

        if (parsed?.Data is TData dataNonNull)
            return dataNonNull;

        throw new InvalidOperationException($"HTTP {(int)resp.StatusCode} {resp.ReasonPhrase}. Body: {body}");
    }

    public static Task<TData> QueryAsync<TData>(
        string query, object? variables = null, string? operationName = null,
        string? userId = null, string? windowName = null, CancellationToken ct = default)
        where TData : class
        => SendAsync<TData>(query, variables, operationName, userId, windowName, ct);

    public static Task<TData> MutationAsync<TData>(
        string mutation, object? variables = null, string? operationName = null,
        string? userId = null, string? windowName = null, CancellationToken ct = default)
        where TData : class
        => SendAsync<TData>(mutation, variables, operationName, userId, windowName, ct);

    /// <summary>
    /// Autentica un usuario contra GraphApi y devuelve el JWT sin tocar el token compartido del helper.
    /// </summary>
    public static async Task<(string Token, DateTime Expires)> AuthenticateAsync(
        string username,
        string password,
        string? userId = null,
        string? windowName = null,
        CancellationToken ct = default)
    {
        const string mutation = """
                mutation GenerarToken($input: clAuthServiceRequestInput!) {
          getgenerarToken(input: $input) {
            token
            expires
          }
        }
        """;

        var payload = new GraphQLRequest
        {
            Query = mutation,
            Variables = new
            {
                input = new
                {
                    nombreUsuario = username,
                    password
                }
            },
            OperationName = "GenerarToken"
        };

        using var req = new HttpRequestMessage(HttpMethod.Post, _endpoint)
        {
            Content = new StringContent(JsonSerializer.Serialize(payload, _json), Encoding.UTF8, "application/json")
        };

        ApplyCustomHeaders(req, userId, windowName);

        using var resp = await _http.SendAsync(req, ct);
        var body = await resp.Content.ReadAsStringAsync(ct);

        GraphQLResponse<TokenEnvelope>? parsed = null;
        try { parsed = JsonSerializer.Deserialize<GraphQLResponse<TokenEnvelope>>(body, _json); } catch { /* ignore */ }

        if (parsed?.Errors is { Length: > 0 })
        {
            var msgs = string.Join(" | ", parsed.Errors.Select(e => e.Message));
            throw new InvalidOperationException($"Error al generar token: {msgs}\nRaw: {body}");
        }

        var tok = parsed?.Data?.GetGenerarToken
            ?? throw new InvalidOperationException($"Respuesta inválida al generar token. Body: {body}");

        if (!DateTimeOffset.TryParse(tok.Expires, out var expiresDto))
            throw new InvalidOperationException($"No se pudo parsear la expiración: {tok.Expires}");

        return (tok.Token, expiresDto.LocalDateTime);
    }

    // ====== Internos ======

    private static void ApplyCustomHeaders(HttpRequestMessage req, string? userId, string? windowName)
    {
        var uid = string.IsNullOrWhiteSpace(userId) ? _defaultUserId : userId;
        var win = string.IsNullOrWhiteSpace(windowName) ? _defaultWindowName : windowName;

        if (!string.IsNullOrWhiteSpace(uid))
            req.Headers.TryAddWithoutValidation("UserID", uid);
        if (!string.IsNullOrWhiteSpace(win))
            req.Headers.TryAddWithoutValidation("WindowName", win);
    }

    private static bool NeedsRefresh()
    {
        var canRefresh = !string.IsNullOrWhiteSpace(_user) && !string.IsNullOrWhiteSpace(_pass);

        if (string.IsNullOrWhiteSpace(_token))
            return canRefresh; // sin token: sólo se puede refrescar si hay user/pass

        if (_expiresUtc is null)
            return false; // tenemos token pero sin fecha: no intentamos refrescar automático

        var skew = TimeSpan.FromSeconds(_refreshSkewSeconds);
        if (_expiresUtc.Value <= DateTimeOffset.MinValue.Add(skew))
            return true;

        try
        {
            return DateTimeOffset.UtcNow >= (_expiresUtc.Value - skew);
        }
        catch (ArgumentOutOfRangeException)
        {
            return true;
        }
    }

    private static async Task EnsureValidTokenAsync(string? userId, string? windowName, CancellationToken ct)
    {
        if (TryLoadBearerFromCurrentRequest())
        {
            return;
        }

        if (!NeedsRefresh()) return;

        await _lock.WaitAsync(ct);
        try
        {
            if (!NeedsRefresh()) return; // doble-check
            await RefreshTokenAsync(userId, windowName, ct);
        }
        finally
        {
            _lock.Release();
        }
    }

    /// <summary>
    /// Genera/renueva el token llamando a:
    /// mutation GenerarToken($input: clAuthServiceRequestInput!) { getgenerarToken(input: $input) { token expires } }
    /// </summary>
    private static async Task RefreshTokenAsync(string? userId, string? windowName, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(_user) || string.IsNullOrWhiteSpace(_pass))
            throw new InvalidOperationException("No hay credenciales para generar token. Usa Configure(endpoint, user, pass) o SetBearer(jwt).");
        var auth = await AuthenticateAsync(_user, _pass, userId, windowName, ct);
        _token = auth.Token;
        _expiresUtc = new DateTimeOffset(auth.Expires).ToUniversalTime();
    }

    private static bool TryLoadBearerFromCurrentRequest()
    {
        var httpContext = _httpContextAccessor?.HttpContext;
        if (httpContext?.User?.Identity?.IsAuthenticated != true)
        {
            return false;
        }

        var token = httpContext.User.FindFirstValue("backend_token");
        if (string.IsNullOrWhiteSpace(token))
        {
            return false;
        }

        var expiresValue = httpContext.User.FindFirstValue("backend_token_expires");
        if (DateTimeOffset.TryParse(expiresValue, out var expires))
        {
            _expiresUtc = expires.ToUniversalTime();

            // Si el token de la cookie ya venció, no cortamos el flujo: dejamos que el helper
            // refresque con las credenciales configuradas en appsettings.
            var skew = TimeSpan.FromSeconds(_refreshSkewSeconds);
            if (DateTimeOffset.UtcNow >= (_expiresUtc.Value - skew))
            {
                _token = token;
                return false;
            }
        }
        else
        {
            _expiresUtc = null;
        }

        _token = token;

        return true;
    }

    // ====== Modelos ======

    private sealed class GraphQLRequest
    {
        [JsonPropertyName("query")] public string? Query { get; set; }
        [JsonPropertyName("variables")] public object? Variables { get; set; }
        [JsonPropertyName("operationName")] public string? OperationName { get; set; }
    }

    private sealed class GraphQLResponse<T>
    {
        [JsonPropertyName("data")] public T? Data { get; set; }
        [JsonPropertyName("errors")] public GraphQLError[]? Errors { get; set; }
    }

    private sealed class GraphQLError
    {
        [JsonPropertyName("message")] public string Message { get; set; } = string.Empty;
    }

    private sealed class TokenEnvelope
    {
        [JsonPropertyName("getgenerarToken")] public TokenData? GetGenerarToken { get; set; }
    }

    private sealed class TokenData
    {
        [JsonPropertyName("token")] public string Token { get; set; } = string.Empty;
        [JsonPropertyName("expires")] public string Expires { get; set; } = string.Empty;
    }
}
