using System.Data;
using System.Text;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using GraphApi.Models.SGR.PerfilMenus;

namespace GraphApi.Services.SGR.PerfilMenus
{
    public class PerfilMenusService : IPerfilMenusService
    {
        private readonly IDbConnection   _objDbDefault;
        private readonly IConfiguration  _objConfig;

        public PerfilMenusService(IDbConnection objDbDefault, IConfiguration objConfig)
        {
            _objDbDefault = objDbDefault;
            _objConfig    = objConfig;
        }

        public async Task<IEnumerable<clReadPerfilMenus>> GetPerfilMenus(
            int userId,
            string windowName)
        {
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT  * 
                FROM sgr.vsPerfilMenus (NOLOCK)
            ");
            var vParameters = new DynamicParameters();
            var vList = await _objDbDefault.QueryAsync<clReadPerfilMenus>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<IEnumerable<dynamic>> GetPerfilMenusDynamic(
            int? perfilMenuID,
            int? perfilID,
            string? perfil,
            int? menuID,
            string? tituloMenu,
            string? icono,
            string? ruta,
            bool? bEliminado,
            string? columnNames,
            int userId,
            string windowName)
        {
            string sColumnNames = string.IsNullOrWhiteSpace(columnNames) ? "PerfilMenuID, PerfilID, Perfil, MenuID, TituloMenu, Icono, Ruta, bEliminado" : columnNames;
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT {sColumnNames}
                FROM sgr.vsPerfilMenus (NOLOCK)
                WHERE 1=1
            ");
            var vParameters = new DynamicParameters();
            if (perfilMenuID.HasValue)
            {
                vSql.Append(" AND PerfilMenuID = @PerfilMenuID");
                vParameters.Add("PerfilMenuID",perfilMenuID);
            }
            if (!string.IsNullOrWhiteSpace(perfil))
            {
                vSql.Append(" AND Perfil LIKE @Perfil");
                vParameters.Add("Perfil",$"%{perfil}%");
            }
            if (!string.IsNullOrWhiteSpace(tituloMenu))
            {
                vSql.Append(" AND TituloMenu LIKE @TituloMenu");
                vParameters.Add("TituloMenu",$"%{tituloMenu}%");
            }
            if (!string.IsNullOrWhiteSpace(icono))
            {
                vSql.Append(" AND Icono LIKE @Icono");
                vParameters.Add("Icono",$"%{icono}%");
            }
            if (!string.IsNullOrWhiteSpace(ruta))
            {
                vSql.Append(" AND Ruta LIKE @Ruta");
                vParameters.Add("Ruta",$"%{ruta}%");
            }
            if (bEliminado.HasValue)
            {
                vSql.Append(" AND bEliminado = @bEliminado");
                vParameters.Add("bEliminado", bEliminado.Value);
            }
            var vList = await _objDbDefault.QueryAsync<dynamic>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<clReadPerfilMenus> CreatePerfilMenus(clCreatePerfilMenus objInput, int userId, string windowName)
        {
            string sInsertSql = $@"
                --WindowName:{windowName},UserID:{userId}
                INSERT INTO sgr.PerfilMenus
                (PerfilID, MenuID, bVisible, bEliminado, Creado, UsuarioCreacionID, FechaCreacion)
                VALUES (@PerfilID, @MenuID, @bVisible, @bEliminado, @Creado, @UsuarioCreacionID, GETDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            ";
            var vInsertParams = new
            {
                objInput.PerfilID,
                objInput.MenuID,
                objInput.bVisible,
                objInput.bEliminado,
                Creado     = windowName,
                UsuarioCreacionID = userId
            };
            var vNewId = await _objDbDefault.ExecuteScalarAsync<int>(sInsertSql, vInsertParams);
            string sSelectSql = @"
                SELECT PerfilMenuID, PerfilID, Perfil, MenuID, TituloMenu, Icono, Ruta, Orden, PadreMenuID, bVisible, bEliminado
                FROM sgr.vsPerfilMenus (NOLOCK)
                WHERE PerfilMenuID = @PerfilMenuID;";
            var vReadParams = new { PerfilMenuID = vNewId };
            var vCreated = await _objDbDefault.QuerySingleOrDefaultAsync<clReadPerfilMenus>(sSelectSql, vReadParams);
            if (vCreated is null) throw new InvalidOperationException($"No se pudo recuperar el PerfilMenu con ID {vNewId}.");
            return vCreated;
        }

        public async Task<clReadPerfilMenus?> UpdatePerfilMenus(clUpdatePerfilMenus objInput, int userId, string windowName)
        {
            var vSets = new List<string>();
            var vParameters = new DynamicParameters();
            vParameters.Add("PerfilMenuID", objInput.PerfilMenuID);
            if (objInput.PerfilID != null)
            {
                vSets.Add("PerfilID = @PerfilID");
                vParameters.Add("PerfilID", objInput.PerfilID);
            }
            if (objInput.MenuID != null)
            {
                vSets.Add("MenuID = @MenuID");
                vParameters.Add("MenuID", objInput.MenuID);
            }
            if (objInput.bVisible != null)
            {
                vSets.Add("bVisible = @bVisible");
                vParameters.Add("bVisible", objInput.bVisible);
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
                UPDATE sgr.PerfilMenus
                SET {vSetClause}
                WHERE PerfilMenuID = @PerfilMenuID;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, vParameters);
            if (vAffected == 0) return null;
            const string sSelect = @"
                SELECT PerfilMenuID, PerfilID, Perfil, MenuID, TituloMenu, Icono, Ruta, Orden, PadreMenuID, bVisible, bEliminado
                FROM sgr.vsPerfilMenus (NOLOCK)
                WHERE PerfilMenuID = @PerfilMenuID;";
            return await _objDbDefault.QueryFirstOrDefaultAsync<clReadPerfilMenus>(sSelect, new {  objInput.PerfilMenuID });
        }

        public async Task<bool> DeletePerfilMenus(int nPerfilMenusID)
        {
            const string sSql = @"
                DELETE FROM sgr.PerfilMenus
                WHERE PerfilMenuID = @Id;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, new { Id = nPerfilMenusID });
            return vAffected > 0;
        }
    }
}
