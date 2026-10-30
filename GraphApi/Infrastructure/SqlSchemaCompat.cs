using System.Collections.Concurrent;
using System.Data;
using Dapper;
using Microsoft.Data.SqlClient;

namespace GraphApi.Infrastructure;

/// <summary>Detección ligera de columnas/tablas según ADR-008 (pre/post DB-001).</summary>
public static class SqlSchemaCompat
{
    private static readonly ConcurrentDictionary<string, bool> SchemaCache = new(StringComparer.OrdinalIgnoreCase);

    private static string CacheKey(string connectionString, string kind, string schema, string objectName, string? column = null)
        => $"{connectionString}|{kind}|{schema}|{objectName}|{column ?? ""}";

    public static void EnsureOpen(IDbConnection db)
    {
        if (db.State != ConnectionState.Open)
            db.Open();
    }

    public static bool HasColumn(IDbConnection db, string schema, string table, string column)
    {
        try
        {
            // Usar la conexión existente para poblar el caché (evita fallo silencioso de nueva conexión)
            var cs = (db as SqlConnection)?.ConnectionString ?? "";
            if (cs.Length > 0)
            {
                var key = CacheKey(cs, "col", schema, table, column);
                if (SchemaCache.TryGetValue(key, out var cached))
                    return cached;
                EnsureOpen(db);
                var result = db.ExecuteScalar<int>(
                    """
                    SELECT COUNT(*) FROM sys.columns c
                    INNER JOIN sys.tables t ON t.object_id = c.object_id
                    INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
                    WHERE s.name = @Schema AND t.name = @Table AND c.name = @Column;
                    """,
                    new { Schema = schema, Table = table, Column = column }) == 1;
                SchemaCache.TryAdd(key, result);
                return result;
            }

            EnsureOpen(db);
            return db.ExecuteScalar<int>(
                """
                SELECT COUNT(*) FROM sys.columns c
                INNER JOIN sys.tables t ON t.object_id = c.object_id
                INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
                WHERE s.name = @Schema AND t.name = @Table AND c.name = @Column;
                """,
                new { Schema = schema, Table = table, Column = column }) == 1;
        }
        catch
        {
            return false;
        }
    }

    private static bool HasColumnOnConnectionString(string connectionString, string schema, string table, string column)
    {
        try
        {
            using var conn = new SqlConnection(connectionString);
            conn.Open();
            return conn.ExecuteScalar<int>(
                """
                SELECT COUNT(*) FROM sys.columns c
                INNER JOIN sys.tables t ON t.object_id = c.object_id
                INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
                WHERE s.name = @Schema AND t.name = @Table AND c.name = @Column;
                """,
                new { Schema = schema, Table = table, Column = column }) == 1;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>Nombre de mascota en usr.Mascotas (post DB-001: Nombre).</summary>
    public static string MascotaNombreColumn(IDbConnection db, string alias = "M")
    {
        return HasColumn(db, "usr", "Mascotas", "Nombre")
            ? $"{alias}.Nombre"
            : $"{alias}.NombreMascota";
    }

    public static string MascotaNombreColumnName(IDbConnection db)
    {
        if (HasColumn(db, "usr", "Mascotas", "Nombre"))
            return "Nombre";
        if (HasColumn(db, "usr", "Mascotas", "NombreMascota"))
            return "NombreMascota";
        return "Nombre";
    }

    /// <summary>Columnas vacunas en listado (delta opcional en BD).</summary>
    public static string MascotaVacunasSelect(IDbConnection db)
    {
        if (HasColumn(db, "usr", "Mascotas", "VacunasAlDia"))
            return "M.VacunasAlDia, M.FechaUltimaVacuna,";
        return "CAST(NULL AS BIT) AS VacunasAlDia, CAST(NULL AS DATE) AS FechaUltimaVacuna,";
    }

    public static bool MascotasTieneVacunas(IDbConnection db)
        => HasColumn(db, "usr", "Mascotas", "VacunasAlDia");

    /// <summary>WMS listo si existen tablas mínimas (sin depender de SELECT sobre datos).</summary>
    public static bool WmsDisponible(IDbConnection db)
        => HasTable(db, "wms", "Articulos")
           && HasTable(db, "wms", "CategoriasArticulo");

    /// <summary>Valida WMS en conexión sin transacción de negocio abierta (llamar antes de BeginTransaction).</summary>
    public static void EnsureWmsOrThrow(IDbConnection db)
    {
        if (WmsDisponible(db))
            return;

        var dbName = CurrentDatabaseName(db);
        var art = HasTable(db, "wms", "Articulos");
        var cat = HasTable(db, "wms", "CategoriasArticulo");
        throw new InvalidOperationException(
            $"El esquema WMS no está desplegado en la base [{dbName}] " +
            $"(wms.Articulos={(art ? "sí" : "no")}, wms.CategoriasArticulo={(cat ? "sí" : "no")}). " +
            "Ejecute SQL/DB-005_wms_schema.sql o SQL/20261029_PROD-ADMIN-001_APLICAR_FALTANTES.sql en esa misma base " +
            "y confirme que ConnectionStrings:Default en runasp.net apunta a esa base (no otra en cfg.Conexion).");
    }

    /// <summary>Catálogo de la conexión actual (sin depender solo de Dapper + DB_NAME).</summary>
    public static string CurrentDatabaseName(IDbConnection db)
    {
        if (db is SqlConnection sql)
        {
            if (!string.IsNullOrWhiteSpace(sql.Database))
                return sql.Database.Trim();

            try
            {
                var csb = new SqlConnectionStringBuilder(sql.ConnectionString);
                if (!string.IsNullOrWhiteSpace(csb.InitialCatalog))
                    return csb.InitialCatalog.Trim();
            }
            catch
            {
                // ignore parse errors
            }
        }

        try
        {
            EnsureOpen(db);
            if (db is SqlConnection opened && !string.IsNullOrWhiteSpace(opened.Database))
                return opened.Database.Trim();

            var raw = db.ExecuteScalar("SELECT DB_NAME()");
            if (raw is null or DBNull)
                return "?";
            return Convert.ToString(raw, System.Globalization.CultureInfo.InvariantCulture)?.Trim() ?? "?";
        }
        catch
        {
            return "?";
        }
    }

    public static bool WmsPrestamosDisponible(IDbConnection db)
        => HasTable(db, "wms", "Prestamos");

    public static bool WmsPrestamosTieneNotas(IDbConnection db)
        => HasColumn(db, "wms", "Prestamos", "Notas");

    /// <summary>Notas en listado de préstamos (post DB-005; legado sin columna).</summary>
    public static string PrestamosNotasSelect(IDbConnection db, string alias = "p")
        => WmsPrestamosTieneNotas(db)
            ? $"{alias}.Notas"
            : "CAST(NULL AS NVARCHAR(500)) AS Notas";

    public static bool HasView(IDbConnection db, string schema, string viewName)
    {
        try
        {
            EnsureOpen(db);
            return db.ExecuteScalar<int?>(
                "SELECT OBJECT_ID(QUOTENAME(@Schema) + '.' + QUOTENAME(@View))",
                new { Schema = schema, View = viewName }) is not null;
        }
        catch
        {
            return false;
        }
    }

    public static bool ViewHasColumn(IDbConnection db, string schema, string viewName, string column)
    {
        try
        {
            var cs = (db as SqlConnection)?.ConnectionString ?? "";
            if (cs.Length > 0)
            {
                var key = CacheKey(cs, "vcol", schema, viewName, column);
                if (SchemaCache.TryGetValue(key, out var cached))
                    return cached;
                EnsureOpen(db);
                var result = db.ExecuteScalar<int>(
                    """
                    SELECT COUNT(*) FROM sys.columns c
                    INNER JOIN sys.views v ON v.object_id = c.object_id
                    INNER JOIN sys.schemas s ON s.schema_id = v.schema_id
                    WHERE s.name = @Schema AND v.name = @View AND c.name = @Column;
                    """,
                    new { Schema = schema, View = viewName, Column = column }) == 1;
                SchemaCache.TryAdd(key, result);
                return result;
            }

            EnsureOpen(db);
            return db.ExecuteScalar<int>(
                """
                SELECT COUNT(*) FROM sys.columns c
                INNER JOIN sys.views v ON v.object_id = c.object_id
                INNER JOIN sys.schemas s ON s.schema_id = v.schema_id
                WHERE s.name = @Schema AND v.name = @View AND c.name = @Column;
                """,
                new { Schema = schema, View = viewName, Column = column }) == 1;
        }
        catch
        {
            return false;
        }
    }

    private static bool ViewHasColumnOnConnectionString(
        string connectionString, string schema, string viewName, string column)
    {
        try
        {
            using var conn = new SqlConnection(connectionString);
            conn.Open();
            return conn.ExecuteScalar<int>(
                """
                SELECT COUNT(*) FROM sys.columns c
                INNER JOIN sys.views v ON v.object_id = c.object_id
                INNER JOIN sys.schemas s ON s.schema_id = v.schema_id
                WHERE s.name = @Schema AND v.name = @View AND c.name = @Column;
                """,
                new { Schema = schema, View = viewName, Column = column }) == 1;
        }
        catch
        {
            return false;
        }
    }

    public static bool HasTable(IDbConnection db, string schema, string table)
    {
        try
        {
            var cs = (db as SqlConnection)?.ConnectionString ?? "";
            if (cs.Length > 0)
            {
                var key = CacheKey(cs, "tbl", schema, table);
                if (SchemaCache.TryGetValue(key, out var cached))
                    return cached;
                EnsureOpen(db);
                var result = db.ExecuteScalar<int?>(
                    "SELECT OBJECT_ID(QUOTENAME(@Schema) + '.' + QUOTENAME(@Table), 'U')",
                    new { Schema = schema, Table = table }) is not null;
                SchemaCache.TryAdd(key, result);
                return result;
            }

            EnsureOpen(db);
            return db.ExecuteScalar<int?>(
                "SELECT OBJECT_ID(QUOTENAME(@Schema) + '.' + QUOTENAME(@Table), 'U')",
                new { Schema = schema, Table = table }) is not null;
        }
        catch
        {
            return false;
        }
    }

    private static bool HasTableOnConnectionString(string connectionString, string schema, string table)
    {
        try
        {
            using var conn = new SqlConnection(connectionString);
            conn.Open();
            return conn.ExecuteScalar<int?>(
                "SELECT OBJECT_ID(QUOTENAME(@Schema) + '.' + QUOTENAME(@Table), 'U')",
                new { Schema = schema, Table = table }) is not null;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>Nombre del rol en sgr.Perfiles (prod/DB-009: Nombre; legado previo a DB-001: Perfil).</summary>
    public static string PerfilNombreColumn(IDbConnection db, string alias = "p")
    {
        if (HasColumn(db, "sgr", "Perfiles", "Nombre"))
            return $"{alias}.Nombre";
        if (HasColumn(db, "sgr", "Perfiles", "Perfil"))
            return $"{alias}.Perfil";
        return $"{alias}.Nombre";
    }

    /// <summary>Columnas de sgr.Usuarios (pre/post DB-001).</summary>
    public static (string Nombre, string Correo, string Activo) UsuarioColumns(
        IDbConnection db, string alias = "u")
    {
        if (HasColumn(db, "sgr", "Usuarios", "Nombre"))
            return ($"{alias}.Nombre", $"{alias}.Correo", $"{alias}.bActivo");
        return ($"{alias}.NombreUsuario", $"{alias}.CorreoUsuario", $"{alias}.bActivoUsuario");
    }

    public static string UsuarioTelefonoColumn(IDbConnection db, string alias = "u")
        => HasColumn(db, "sgr", "Usuarios", "Telefono")
            ? $"{alias}.Telefono"
            : $"{alias}.TelefonoUsuario";

    public static string CondominioNombreColumn(IDbConnection db, string alias = "cond")
        => HasColumn(db, "sgr", "Condominios", "Nombre")
            ? $"{alias}.Nombre"
            : $"{alias}.NombreCondominio";

    public static string CasaDireccionColumn(IDbConnection db, string casaAlias = "ca")
        => HasColumn(db, "sgr", "Casas", "Direccion")
            ? $"{casaAlias}.Direccion"
            : $"{casaAlias}.DireccionCasa";

    /// <summary>Expresión SELECT para número de casa (Numero vs NumeroExtCasa).</summary>
    public static string CasaNumeroSelect(IDbConnection db, string casaAlias = "ca")
    {
        var col = HasColumn(db, "sgr", "Casas", "Numero")
            ? $"{casaAlias}.Numero"
            : $"{casaAlias}.NumeroExtCasa";
        return $"CAST({col} AS NVARCHAR(50))";
    }

    /// <summary>JOIN casa vigente del residente (CasaOcupantes o propietario).</summary>
    public static string CasaPorUsuarioJoin(IDbConnection db, string usuarioFkSql)
    {
        if (HasTable(db, "sgr", "CasaOcupantes"))
        {
            return $"""
                OUTER APPLY (
                    SELECT TOP (1) o.CasaID
                    FROM sgr.CasaOcupantes o WITH (NOLOCK)
                    WHERE o.UsuarioID = {usuarioFkSql} AND o.Vigente = 1 AND o.bEliminado = 0
                    ORDER BY o.CasaOcupanteID
                ) co
                LEFT JOIN sgr.Casas ca WITH (NOLOCK) ON ca.CasaID = co.CasaID AND ca.bEliminado = 0
                """;
        }

        return $"""
            LEFT JOIN sgr.Casas ca WITH (NOLOCK) ON ca.PropietarioUsuarioID = {usuarioFkSql} AND ca.bEliminado = 0
            """;
    }

    /// <summary>COUNT(*) y agregados SQL Server devuelven bigint; Dapper no castea a int.</summary>
    public static int ScalarToInt32(object? value)
        => value is null or DBNull ? 0 : Convert.ToInt32(value);
}
