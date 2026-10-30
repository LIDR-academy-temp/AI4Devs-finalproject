using System.Data;
using System.Text;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using GraphApi.Models.SGR.Condominios;

namespace GraphApi.Services.SGR.Condominios
{
    public class CondominiosService : ICondominiosService
    {
        private readonly IDbConnection   _objDbDefault;
        private readonly IConfiguration  _objConfig;

        public CondominiosService(IDbConnection objDbDefault, IConfiguration objConfig)
        {
            _objDbDefault = objDbDefault;
            _objConfig    = objConfig;
        }

        public async Task<IEnumerable<clReadCondominios>> GetCondominios(
            int userId,
            string windowName)
        {
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT  * 
                FROM sgr.Condominios (NOLOCK)
            ");
            var vParameters = new DynamicParameters();
            var vList = await _objDbDefault.QueryAsync<clReadCondominios>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<IEnumerable<dynamic>> GetCondominiosDynamic(
            int? condominioID,
            string? nombreCondominio,
            string? direccionCondominio,
            bool? bEliminado,
            string? columnNames,
            int userId,
            string windowName)
        {
            string sColumnNames = string.IsNullOrWhiteSpace(columnNames) ? "CondominioID, Nombre, Direccion, bEliminado" : columnNames;
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT {sColumnNames}
                FROM sgr.Condominios (NOLOCK)
                WHERE 1=1
            ");
            var vParameters = new DynamicParameters();
            if (condominioID.HasValue)
            {
                vSql.Append(" AND CondominioID = @CondominioID");
                vParameters.Add("CondominioID",condominioID);
            }
            if (!string.IsNullOrWhiteSpace(nombreCondominio))
            {
                vSql.Append(" AND Nombre LIKE @NombreCondominio");
                vParameters.Add("NombreCondominio",$"%{nombreCondominio}%");
            }
            if (!string.IsNullOrWhiteSpace(direccionCondominio))
            {
                vSql.Append(" AND Direccion LIKE @DireccionCondominio");
                vParameters.Add("DireccionCondominio",$"%{direccionCondominio}%");
            }
            if (bEliminado.HasValue)
            {
                vSql.Append(" AND bEliminado = @bEliminado");
                vParameters.Add("bEliminado", bEliminado.Value);
            }
            var vList = await _objDbDefault.QueryAsync<dynamic>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<clReadCondominios> CreateCondominios(clCreateCondominios objInput, int userId, string windowName)
        {
            string sInsertSql = $@"
                --WindowName:{windowName},UserID:{userId}
                INSERT INTO sgr.Condominios
                (Nombre, Direccion, bEliminado, Creado, UsuarioCreacionID, FechaCreacion)
                VALUES (@NombreCondominio, @DireccionCondominio, @bEliminado, @Creado, @UsuarioCreacionID, GETDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            ";
            var vInsertParams = new
            {
                objInput.NombreCondominio,
                objInput.DireccionCondominio,
                objInput.bEliminado,
                Creado     = windowName,
                UsuarioCreacionID = userId
            };
            var vNewId = await _objDbDefault.ExecuteScalarAsync<int>(sInsertSql, vInsertParams);
            string sSelectSql = @"
                SELECT CondominioID, Nombre, Direccion, bEliminado
                FROM sgr.Condominios (NOLOCK)
                WHERE CondominioID = @CondominioID;";
            var vReadParams = new { CondominioID = vNewId };
            var vCreated = await _objDbDefault.QuerySingleOrDefaultAsync<clReadCondominios>(sSelectSql, vReadParams);
            if (vCreated is null) throw new InvalidOperationException($"No se pudo recuperar el Condominio con ID {vNewId}.");
            return vCreated;
        }

        public async Task<clReadCondominios?> UpdateCondominios(clUpdateCondominios objInput, int userId, string windowName)
        {
            var vSets = new List<string>();
            var vParameters = new DynamicParameters();
            vParameters.Add("CondominioID", objInput.CondominioID);
            if (objInput.NombreCondominio is not null)
            {
                vSets.Add("Nombre = @NombreCondominio");
                vParameters.Add("NombreCondominio", objInput.NombreCondominio);
            }
            if (objInput.DireccionCondominio is not null)
            {
                vSets.Add("Direccion = @DireccionCondominio");
                vParameters.Add("DireccionCondominio", objInput.DireccionCondominio);
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
                UPDATE sgr.Condominios
                SET {vSetClause}
                WHERE CondominioID = @CondominioID;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, vParameters);
            if (vAffected == 0) return null;
            const string sSelect = @"
                SELECT CondominioID, Nombre, Direccion, bEliminado
                FROM sgr.Condominios (NOLOCK)
                WHERE CondominioID = @CondominioID;";
            return await _objDbDefault.QueryFirstOrDefaultAsync<clReadCondominios>(sSelect, new {  objInput.CondominioID });
        }

        public async Task<bool> DeleteCondominios(int nCondominiosID)
        {
            const string sSql = @"
                DELETE FROM sgr.Condominios
                WHERE CondominioID = @Id;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, new { Id = nCondominiosID });
            return vAffected > 0;
        }
    }
}
