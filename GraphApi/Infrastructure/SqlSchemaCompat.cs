using System.Data;
using Dapper;

namespace GraphApi.Infrastructure;

/// <summary>Detección ligera de columnas/tablas según ADR-008 (pre/post DB-001).</summary>
public static class SqlSchemaCompat
{
    public static void EnsureOpen(IDbConnection db)
    {
        if (db.State != ConnectionState.Open)
            db.Open();
    }

    public static bool HasColumn(IDbConnection db, string schema, string table, string column)
    {
        try
        {
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

    public static bool WmsDisponible(IDbConnection db)
        => HasTable(db, "wms", "Articulos");

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

    public static bool HasTable(IDbConnection db, string schema, string table)
    {
        try
        {
            EnsureOpen(db);
            return db.ExecuteScalar<int>(
                """
                SELECT COUNT(*) FROM sys.tables t
                INNER JOIN sys.schemas s ON s.schema_id = t.schema_id
                WHERE s.name = @Schema AND t.name = @Table;
                """,
                new { Schema = schema, Table = table }) == 1;
        }
        catch
        {
            return false;
        }
    }

    /// <summary>Nombre lógico del perfil en sgr.Perfiles (post DB-001: Perfil; legado lógico: Nombre).</summary>
    public static string PerfilNombreColumn(IDbConnection db, string alias = "p")
        => HasColumn(db, "sgr", "Perfiles", "Perfil")
            ? $"{alias}.Perfil"
            : $"{alias}.Nombre";

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
}
