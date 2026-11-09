using System.Data;
using System.Text;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using GraphApi.Models.TKT.DocumentosTicket;

namespace GraphApi.Services.TKT.DocumentosTicket
{
    public class DocumentosTicketService : IDocumentosTicketService
    {
        private readonly IDbConnection   _objDbDefault;
        private readonly IConfiguration  _objConfig;

        public DocumentosTicketService(IDbConnection objDbDefault, IConfiguration objConfig)
        {
            _objDbDefault = objDbDefault;
            _objConfig    = objConfig;
        }

        public async Task<IEnumerable<clReadDocumentosTicket>> GetDocumentosTickets(
            int userId,
            string windowName)
        {
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT  DocumentoTicketID, TicketID, DocumentoID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado 
                FROM tkt.DocumentosTicket (NOLOCK)
            ");
            var vParameters = new DynamicParameters();
            var vList = await _objDbDefault.QueryAsync<clReadDocumentosTicket>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<IEnumerable<dynamic>> GetDocumentosTicketsDynamic(
            int? documentoTicketID,
            int? ticketID,
            int? documentoID,
            bool? bEliminado,
            string? columnNames,
            int userId,
            string windowName)
        {
            string sColumnNames = string.IsNullOrWhiteSpace(columnNames) ? "DocumentoTicketID, TicketID, DocumentoID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado" : columnNames;
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT {sColumnNames}
                FROM tkt.DocumentosTicket (NOLOCK)
                WHERE 1=1
            ");
            var vParameters = new DynamicParameters();
            if (documentoTicketID.HasValue)
            {
                vSql.Append(" AND DocumentoTicketID = @DocumentoTicketID");
                vParameters.Add("DocumentoTicketID",documentoTicketID);
            }
            if (bEliminado.HasValue)
            {
                vSql.Append(" AND bEliminado = @bEliminado");
                vParameters.Add("bEliminado", bEliminado.Value);
            }
            var vList = await _objDbDefault.QueryAsync<dynamic>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<clReadDocumentosTicket> CreateDocumentosTicket(clCreateDocumentosTicket objInput, int userId, string windowName)
        {
            string sInsertSql = $@"
                --WindowName:{windowName},UserID:{userId}
                INSERT INTO tkt.DocumentosTicket
                (TicketID, DocumentoID, bEliminado, Creado, UsuarioCreacionID, FechaCreacion)
                VALUES (@TicketID, @DocumentoID, @bEliminado, @Creado, @UsuarioCreacionID, GETDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            ";
            var vInsertParams = new
            {
                objInput.TicketID,
                objInput.DocumentoID,
                objInput.bEliminado,
                Creado     = windowName,
                UsuarioCreacionID = userId
            };
            var vNewId = await _objDbDefault.ExecuteScalarAsync<int>(sInsertSql, vInsertParams);
            string sSelectSql = @"
                SELECT DocumentoTicketID, TicketID, DocumentoID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado
                FROM tkt.DocumentosTicket (NOLOCK)
                WHERE DocumentoTicketID = @DocumentoTicketID;";
            var vReadParams = new { DocumentoTicketID = vNewId };
            var vCreated = await _objDbDefault.QuerySingleOrDefaultAsync<clReadDocumentosTicket>(sSelectSql, vReadParams);
            if (vCreated is null) throw new InvalidOperationException($"No se pudo recuperar el DocumentosTicket con ID {vNewId}.");
            return vCreated;
        }

        public async Task<clReadDocumentosTicket?> UpdateDocumentosTicket(clUpdateDocumentosTicket objInput, int userId, string windowName)
        {
            var vSets = new List<string>();
            var vParameters = new DynamicParameters();
            vParameters.Add("DocumentoTicketID", objInput.DocumentoTicketID);
            if (objInput.TicketID != null)
            {
                vSets.Add("TicketID = @TicketID");
                vParameters.Add("TicketID", objInput.TicketID);
            }
            if (objInput.DocumentoID != null)
            {
                vSets.Add("DocumentoID = @DocumentoID");
                vParameters.Add("DocumentoID", objInput.DocumentoID);
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
                UPDATE tkt.DocumentosTicket
                SET {vSetClause}
                WHERE DocumentoTicketID = @DocumentoTicketID;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, vParameters);
            if (vAffected == 0) return null;
            const string sSelect = @"
                SELECT DocumentoTicketID, TicketID, DocumentoID, Creado, UsuarioCreacionID, FechaCreacion, bEliminado
                FROM tkt.DocumentosTicket (NOLOCK)
                WHERE DocumentoTicketID = @DocumentoTicketID;";
            return await _objDbDefault.QueryFirstOrDefaultAsync<clReadDocumentosTicket>(sSelect, new {  objInput.DocumentoTicketID });
        }

        public async Task<bool> DeleteDocumentosTicket(int nDocumentosTicketID)
        {
            const string sSql = @"
                DELETE FROM tkt.DocumentosTicket
                WHERE DocumentoTicketID = @Id;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, new { Id = nDocumentosTicketID });
            return vAffected > 0;
        }
    }
}
