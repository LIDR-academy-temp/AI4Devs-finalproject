using System.Data;
using System.Text;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using GraphApi.Models.USR.Automoviles;
using Serilog;

namespace GraphApi.Services.USR.Automoviles
{
    public class AutomovilesService : IAutomovilesService
    {
        private readonly IDbConnection   _objDbDefault;
        private readonly IConfiguration  _objConfig;

        public AutomovilesService(IDbConnection objDbDefault, IConfiguration objConfig)
        {
            _objDbDefault = objDbDefault;
            _objConfig    = objConfig;
        }

        public async Task<IEnumerable<clReadAutomoviles>> GetAutomoviles(
            int userId,
            string windowName)
        {
            // Read directly from base table with LEFT JOINs to avoid cases where the view (usr.vsAutomoviles)
            // omits rows when some foreign keys are NULL. This ensures read-after-write consistency.
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT A.AutomovilID,
                       A.UsuarioID,
                       U.NombreUsuario,
                       U.CorreoUsuario,
                       A.MarcaID,
                       M.Marca,
                       A.ModeloID,
                       A.ModeloLibre,
                       MO.Modelo,
                       A.Placas,
                       A.Color,
                       A.bEliminado
                FROM usr.Automoviles A (NOLOCK)
                LEFT JOIN sgr.Usuarios U (NOLOCK) ON U.UsuarioID = A.UsuarioID
                LEFT JOIN usr.Marcas M (NOLOCK) ON M.MarcaID = A.MarcaID
                LEFT JOIN usr.Modelos MO (NOLOCK) ON MO.ModeloID = A.ModeloID
            ");
            var vParameters = new DynamicParameters();
            var vList = await _objDbDefault.QueryAsync<clReadAutomoviles>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<IEnumerable<dynamic>> GetAutomovilesDynamic(
            int? automovilID,
            int? usuarioID,
            string? nombreUsuario,
            string? correoUsuario,
            int? marcaID,
            string? marca,
            int? modeloID,
            string? modelo,
            string? placas,
            string? color,
            bool? bEliminado,
            string? columnNames,
            int userId,
            string windowName)
        {
            string sColumnNames = string.IsNullOrWhiteSpace(columnNames) ? "AutomovilID, UsuarioID, NombreUsuario, CorreoUsuario, MarcaID, Marca, ModeloID, ModeloLibre, Modelo, Placas, Color, bEliminado" : columnNames;
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT {sColumnNames}
                FROM usr.vsAutomoviles (NOLOCK)
                WHERE 1=1
            ");
            var vParameters = new DynamicParameters();
            if (automovilID.HasValue)
            {
                vSql.Append(" AND AutomovilID = @AutomovilID");
                vParameters.Add("AutomovilID",automovilID);
            }
            if (!string.IsNullOrWhiteSpace(nombreUsuario))
            {
                vSql.Append(" AND NombreUsuario LIKE @NombreUsuario");
                vParameters.Add("NombreUsuario",$"%{nombreUsuario}%");
            }
            if (!string.IsNullOrWhiteSpace(correoUsuario))
            {
                vSql.Append(" AND CorreoUsuario LIKE @CorreoUsuario");
                vParameters.Add("CorreoUsuario",$"%{correoUsuario}%");
            }
            if (!string.IsNullOrWhiteSpace(marca))
            {
                vSql.Append(" AND Marca LIKE @Marca");
                vParameters.Add("Marca",$"%{marca}%");
            }
            if (!string.IsNullOrWhiteSpace(modelo))
            {
                vSql.Append(" AND Modelo LIKE @Modelo");
                vParameters.Add("Modelo",$"%{modelo}%");
            }
            if (!string.IsNullOrWhiteSpace(placas))
            {
                vSql.Append(" AND Placas LIKE @Placas");
                vParameters.Add("Placas",$"%{placas}%");
            }
            if (!string.IsNullOrWhiteSpace(color))
            {
                vSql.Append(" AND Color LIKE @Color");
                vParameters.Add("Color",$"%{color}%");
            }
            if (bEliminado.HasValue)
            {
                vSql.Append(" AND bEliminado = @bEliminado");
                vParameters.Add("bEliminado", bEliminado.Value);
            }
            var vList = await _objDbDefault.QueryAsync<dynamic>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<clReadAutomoviles> CreateAutomoviles(clCreateAutomoviles objInput, int userId, string windowName)
        {
            string sInsertSql = $@"
                --WindowName:{windowName},UserID:{userId}
                INSERT INTO usr.Automoviles
                (UsuarioID, MarcaID, ModeloID, ModeloLibre, Placas, Color, bEliminado, Creado, UsuarioCreacionID, FechaCreacion)
                VALUES (@UsuarioID, @MarcaID, @ModeloID, @ModeloLibre, @Placas, @Color, @bEliminado, @Creado, @UsuarioCreacionID, GETDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            ";
            var vInsertParams = new
            {
                UsuarioID = userId,
                objInput.MarcaID,
                objInput.ModeloID,
                objInput.ModeloLibre,
                objInput.Placas,
                objInput.Color,
                objInput.bEliminado,
                Creado     = windowName,
                UsuarioCreacionID = userId
            };
            var vNewId = await _objDbDefault.ExecuteScalarAsync<int>(sInsertSql, vInsertParams);
            string sSelectSql = @"
                SELECT AutomovilID, UsuarioID, NombreUsuario, CorreoUsuario, MarcaID, Marca, ModeloID, ModeloLibre, Modelo, Placas, Color, bEliminado
                FROM usr.vsAutomoviles (NOLOCK)
                WHERE AutomovilID = @AutomovilID;";
            var vReadParams = new { AutomovilID = vNewId };
            var vCreated = await _objDbDefault.QuerySingleOrDefaultAsync<clReadAutomoviles>(sSelectSql, vReadParams);
            if (vCreated is null)
            {
                // Fallback: la vista `usr.vsAutomoviles` puede excluir filas cuando algunos FK son NULL
                // (p.ej. MarcaID o ModeloID). Intentamos leer directamente desde la tabla con LEFT JOINs
                // para no depender de la vista.
                const string sFallback = @"
                    SELECT A.AutomovilID,
                           A.UsuarioID,
                           U.NombreUsuario,
                           U.CorreoUsuario,
                           A.MarcaID,
                           M.Marca,
                           A.ModeloID,
                           A.ModeloLibre,
                           MO.Modelo,
                           A.Placas,
                           A.Color,
                           A.bEliminado
                    FROM usr.Automoviles A (NOLOCK)
                    LEFT JOIN sgr.Usuarios U (NOLOCK) ON U.UsuarioID = A.UsuarioID
                    LEFT JOIN usr.Marcas M (NOLOCK) ON M.MarcaID = A.MarcaID
                    LEFT JOIN usr.Modelos MO (NOLOCK) ON MO.ModeloID = A.ModeloID
                    WHERE A.AutomovilID = @AutomovilID;";

                var vFallback = await _objDbDefault.QuerySingleOrDefaultAsync<clReadAutomoviles>(sFallback, vReadParams);
                if (vFallback is null) throw new InvalidOperationException($"No se pudo recuperar el Automovile con ID {vNewId}.");
                return vFallback;
            }

            return vCreated;
        }

        public async Task<clReadAutomoviles?> UpdateAutomoviles(clUpdateAutomoviles objInput, int userId, string windowName)
        {
            var vSets = new List<string>();
            var vParameters = new DynamicParameters();
            vParameters.Add("AutomovilID", objInput.AutomovilID);
            if (objInput.UsuarioID != null)
            {
                vSets.Add("UsuarioID = @UsuarioID");
                vParameters.Add("UsuarioID", objInput.UsuarioID);
            }
            if (objInput.MarcaID != null)
            {
                vSets.Add("MarcaID = @MarcaID");
                vParameters.Add("MarcaID", objInput.MarcaID);
            }
            if (objInput.ModeloID != null)
            {
                vSets.Add("ModeloID = @ModeloID");
                vParameters.Add("ModeloID", objInput.ModeloID);
            }
            if (objInput.ModeloLibre is not null)
            {
                vSets.Add("ModeloLibre = @ModeloLibre");
                vParameters.Add("ModeloLibre", objInput.ModeloLibre);
            }
            if (objInput.Placas is not null)
            {
                vSets.Add("Placas = @Placas");
                vParameters.Add("Placas", objInput.Placas);
            }
            if (objInput.Color is not null)
            {
                vSets.Add("Color = @Color");
                vParameters.Add("Color", objInput.Color);
            }
            if (objInput.bEliminado != null)
            {
                vSets.Add("bEliminado = @bEliminado");
                vParameters.Add("bEliminado", objInput.bEliminado);
            }
            vSets.Add($"Modificado = '{windowName}'");
            vSets.Add($"UsuarioModificacionID = {userId}");
            vSets.Add("FechaModificacion = GETDATE()");
            var vSetClause = string.Join(", ", vSets);
            var sSql = $@"
                --WindowName:{windowName},UserID:{userId}
                UPDATE usr.Automoviles
                SET {vSetClause}
                WHERE AutomovilID = @AutomovilID;";
            // Debug logging: dump key update info to console to help troubleshooting
            try
            {
                Log.Information("[DEBUG] UpdateAutomoviles - AutomovilID={AutomovilID}, ModeloLibre={ModeloLibre}, Placas={Placas}, Color={Color}", objInput.AutomovilID, objInput.ModeloLibre, objInput.Placas, objInput.Color);
                Log.Information("[DEBUG] Update SQL: {Sql}", sSql);
            }
            catch { /* swallow logging errors */ }

            var vAffected = await _objDbDefault.ExecuteAsync(sSql, vParameters);
            try
            {
                Log.Information("[DEBUG] UpdateAffected={Affected}", vAffected);
            }
            catch { }
            if (vAffected == 0) return null;
            const string sSelect = @"
                SELECT AutomovilID, UsuarioID, NombreUsuario, CorreoUsuario, MarcaID, Marca, ModeloID, ModeloLibre, Modelo, Placas, Color, bEliminado
                FROM usr.vsAutomoviles (NOLOCK)
                WHERE AutomovilID = @AutomovilID;";

            var vResult = await _objDbDefault.QueryFirstOrDefaultAsync<clReadAutomoviles>(sSelect, new { objInput.AutomovilID });
            if (vResult is not null) return vResult;
            try
            {
                Log.Information("[DEBUG] vsAutomoviles returned null for AutomovilID={AutomovilID}", objInput.AutomovilID);
            }
            catch { }

            // Fallback: la vista `usr.vsAutomoviles` puede excluir filas cuando algunos FK son NULL
            // (p.ej. MarcaID o ModeloID). Intentamos leer directamente desde la tabla con LEFT JOINs
            // para no depender de la vista y devolver el registro actualizado.
            const string sFallback = @"
                SELECT A.AutomovilID,
                       A.UsuarioID,
                       U.NombreUsuario,
                       U.CorreoUsuario,
                       A.MarcaID,
                       M.Marca,
                       A.ModeloID,
                       A.ModeloLibre,
                       MO.Modelo,
                       A.Placas,
                       A.Color,
                       A.bEliminado
                FROM usr.Automoviles A (NOLOCK)
                LEFT JOIN sgr.Usuarios U (NOLOCK) ON U.UsuarioID = A.UsuarioID
                LEFT JOIN usr.Marcas M (NOLOCK) ON M.MarcaID = A.MarcaID
                LEFT JOIN usr.Modelos MO (NOLOCK) ON MO.ModeloID = A.ModeloID
                WHERE A.AutomovilID = @AutomovilID;";

            var vFallback = await _objDbDefault.QueryFirstOrDefaultAsync<clReadAutomoviles>(sFallback, new { AutomovilID = objInput.AutomovilID });
            return vFallback;
        }

        public async Task<bool> DeleteAutomoviles(int nAutomovilesID)
        {
            const string sSql = @"
                DELETE FROM usr.Automoviles
                WHERE AutomovilID = @Id;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, new { Id = nAutomovilesID });
            return vAffected > 0;
        }
    }
}
