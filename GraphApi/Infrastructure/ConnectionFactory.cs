using Microsoft.Data.SqlClient;
using System.Collections.Concurrent;
using System.Data;

namespace GraphApi.Infrastructure
{
    public class ConnectionFactory : IConnectionFactory
    {
        private readonly IConfiguration _objConfig;

        /// <summary>Cache de cadenas de conexion leidas desde cfg.Conexion (fallback a appsettings).</summary>
        private readonly ConcurrentDictionary<string, string> _dbCache
            = new(StringComparer.OrdinalIgnoreCase);

        public ConnectionFactory(IConfiguration objConfig) => _objConfig = objConfig;

        public IDbConnection Create(string sKey)
        {
            var resolvedKey = ResolveKey(sKey);

            var sConnStr = _objConfig.GetConnectionString(resolvedKey);
            if (sConnStr is not null)
                return new SqlConnection(sConnStr);

            sConnStr = _dbCache.GetOrAdd(resolvedKey, key =>
            {
                var defaultCs = _objConfig.GetConnectionString("Default")
                    ?? throw new InvalidOperationException("No existe connection string 'Default' en appsettings.");

                using var conn = new SqlConnection(defaultCs);
                conn.Open();
                using var cmd = conn.CreateCommand();
                cmd.CommandText =
                    "SELECT TOP 1 CadenaConexion FROM cfg.Conexion WITH (NOLOCK) " +
                    "WHERE ConexionNombre = @Key AND bActivo = 1";
                cmd.Parameters.Add(new SqlParameter("@Key", key));
                var result = cmd.ExecuteScalar() as string;
                return result
                    ?? throw new InvalidOperationException($"El ambiente '{key}' no existe en appsettings ni en cfg.Conexion.");
            });

            return new SqlConnection(sConnStr);
        }

        public void InvalidateCache(string sKey)
            => _dbCache.TryRemove(ResolveKey(sKey), out _);

        /// <summary>Mapea el valor numerico del header Environment al nombre de connection string.</summary>
        private static string ResolveKey(string key) => key switch
        {
            "1" => "Default",
            "666" => "Test",
            "777" => "Dev",
            _ => key
        };
    }
}