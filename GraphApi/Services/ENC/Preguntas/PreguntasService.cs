using System.Data;
using System.Text;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using GraphApi.Models.ENC.Preguntas;

namespace GraphApi.Services.ENC.Preguntas
{
    public class PreguntasService : IPreguntasService
    {
        private readonly IDbConnection   _objDbDefault;
        private readonly IConfiguration  _objConfig;

        public PreguntasService(IDbConnection objDbDefault, IConfiguration objConfig)
        {
            _objDbDefault = objDbDefault;
            _objConfig    = objConfig;
        }

        public async Task<IEnumerable<clReadPreguntas>> GetPreguntas(
            int userId,
            string windowName)
        {
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT  * 
                FROM enc.Preguntas (NOLOCK)
            ");
            var vParameters = new DynamicParameters();
            var vList = await _objDbDefault.QueryAsync<clReadPreguntas>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<IEnumerable<dynamic>> GetPreguntasDynamic(
            int? preguntaID,
            int? encuestaID,
            string? texto,
            int? tipoPreguntaID,
            int? orden,
            bool? requerida,
            bool? bEliminado,
            string? columnNames,
            int userId,
            string windowName)
        {
            string sColumnNames = string.IsNullOrWhiteSpace(columnNames) ? "PreguntaID, EncuestaID, Texto, TipoPreguntaID, Orden, Requerida, bEliminado" : columnNames;
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT {sColumnNames}
                FROM enc.Preguntas (NOLOCK)
                WHERE 1=1
            ");
            var vParameters = new DynamicParameters();
            if (preguntaID.HasValue)
            {
                vSql.Append(" AND PreguntaID = @PreguntaID");
                vParameters.Add("PreguntaID",preguntaID);
            }
            if (!string.IsNullOrWhiteSpace(texto))
            {
                vSql.Append(" AND Texto LIKE @Texto");
                vParameters.Add("Texto",$"%{texto}%");
            }
            if (requerida.HasValue)
            {
                vSql.Append(" AND Requerida = @Requerida");
                vParameters.Add("Requerida", requerida.Value);
            }
            if (bEliminado.HasValue)
            {
                vSql.Append(" AND bEliminado = @bEliminado");
                vParameters.Add("bEliminado", bEliminado.Value);
            }
            var vList = await _objDbDefault.QueryAsync<dynamic>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<clReadPreguntas> CreatePreguntas(clCreatePreguntas objInput, int userId, string windowName)
        {
            string sInsertSql = $@"
                --WindowName:{windowName},UserID:{userId}
                INSERT INTO enc.Preguntas
                (EncuestaID, Texto, TipoPreguntaID, Orden, Requerida, bEliminado, Creado, UsuarioCreacionID, FechaCreacion)
                VALUES (@EncuestaID, @Texto, @TipoPreguntaID, @Orden, @Requerida, @bEliminado, @Creado, @UsuarioCreacionID, GETDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            ";
            var vInsertParams = new
            {
                objInput.EncuestaID,
                objInput.Texto,
                objInput.TipoPreguntaID,
                objInput.Orden,
                objInput.Requerida,
                objInput.bEliminado,
                Creado     = windowName,
                UsuarioCreacionID = userId
            };
            var vNewId = await _objDbDefault.ExecuteScalarAsync<int>(sInsertSql, vInsertParams);
            string sSelectSql = @"
                SELECT PreguntaID, EncuestaID, Texto, TipoPreguntaID, Orden, Requerida, bEliminado
                FROM enc.Preguntas (NOLOCK)
                WHERE PreguntaID = @PreguntaID;";
            var vReadParams = new { PreguntaID = vNewId };
            var vCreated = await _objDbDefault.QuerySingleOrDefaultAsync<clReadPreguntas>(sSelectSql, vReadParams);
            if (vCreated is null) throw new InvalidOperationException($"No se pudo recuperar el Pregunta con ID {vNewId}.");
            return vCreated;
        }

        public async Task<clReadPreguntas?> UpdatePreguntas(clUpdatePreguntas objInput, int userId, string windowName)
        {
            var vSets = new List<string>();
            var vParameters = new DynamicParameters();
            vParameters.Add("PreguntaID", objInput.PreguntaID);
            if (objInput.EncuestaID != null)
            {
                vSets.Add("EncuestaID = @EncuestaID");
                vParameters.Add("EncuestaID", objInput.EncuestaID);
            }
            if (objInput.Texto is not null)
            {
                vSets.Add("Texto = @Texto");
                vParameters.Add("Texto", objInput.Texto);
            }
            if (objInput.TipoPreguntaID != null)
            {
                vSets.Add("TipoPreguntaID = @TipoPreguntaID");
                vParameters.Add("TipoPreguntaID", objInput.TipoPreguntaID);
            }
            if (objInput.Orden != null)
            {
                vSets.Add("Orden = @Orden");
                vParameters.Add("Orden", objInput.Orden);
            }
            if (objInput.Requerida != null)
            {
                vSets.Add("Requerida = @Requerida");
                vParameters.Add("Requerida", objInput.Requerida);
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
                UPDATE enc.Preguntas
                SET {vSetClause}
                WHERE PreguntaID = @PreguntaID;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, vParameters);
            if (vAffected == 0) return null;
            const string sSelect = @"
                SELECT PreguntaID, EncuestaID, Texto, TipoPreguntaID, Orden, Requerida, bEliminado
                FROM enc.Preguntas (NOLOCK)
                WHERE PreguntaID = @PreguntaID;";
            return await _objDbDefault.QueryFirstOrDefaultAsync<clReadPreguntas>(sSelect, new {  objInput.PreguntaID });
        }

        public async Task<bool> DeletePreguntas(int nPreguntasID)
        {
            const string sSql = @"
                DELETE FROM enc.OpcionesPregunta WHERE PreguntaID = @Id;
                DELETE FROM enc.Preguntas         WHERE PreguntaID = @Id;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, new { Id = nPreguntasID });
            return vAffected >= 0;
        }
    }
}
