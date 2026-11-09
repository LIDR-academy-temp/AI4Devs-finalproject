using System.Data;
using System.Text;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using GraphApi.Models.TKT.Tickets;
using GraphApi.Models.NTF.Notificaciones;

namespace GraphApi.Services.TKT.Tickets
{
    public class TicketsService : ITicketsService
    {
        private readonly IDbConnection   _objDbDefault;
        private readonly IConfiguration  _objConfig;

        public TicketsService(IDbConnection objDbDefault, IConfiguration objConfig)
        {
            _objDbDefault = objDbDefault;
            _objConfig    = objConfig;
        }

        public async Task<IEnumerable<clReadTickets>> GetTickets(
            int userId,
            string windowName)
        {
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT  * 
                FROM tkt.vsTickets (NOLOCK)
            ");
            var vParameters = new DynamicParameters();
            var vList = await _objDbDefault.QueryAsync<clReadTickets>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<IEnumerable<dynamic>> GetTicketsDynamic(
            int? ticketID,
            string? tituloTicket,
            string? descripcionTicket,
            int? usuarioSolicitanteID,
            string? nombreSolicitante,
            int? prioridadTicketID,
            string? prioridadTicket,
            int? estadoTicketID,
            string? estadoTicket,
            DateTime? fechaCreacionTicket,
            DateTime? fechaCierre,
            bool? bEliminado,
            string? columnNames,
            int userId,
            string windowName)
        {
            string sColumnNames = string.IsNullOrWhiteSpace(columnNames) ? "TicketID, TituloTicket, DescripcionTicket, UsuarioSolicitanteID, NombreSolicitante, PrioridadTicketID, PrioridadTicket, EstadoTicketID, EstadoTicket, FechaCreacionTicket, FechaCierre, bEliminado" : columnNames;
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT {sColumnNames}
                FROM tkt.vsTickets (NOLOCK)
                WHERE 1=1
            ");
            var vParameters = new DynamicParameters();
            if (ticketID.HasValue)
            {
                vSql.Append(" AND TicketID = @TicketID");
                vParameters.Add("TicketID",ticketID);
            }
            if (!string.IsNullOrWhiteSpace(tituloTicket))
            {
                vSql.Append(" AND TituloTicket LIKE @TituloTicket");
                vParameters.Add("TituloTicket",$"%{tituloTicket}%");
            }
            if (!string.IsNullOrWhiteSpace(descripcionTicket))
            {
                vSql.Append(" AND DescripcionTicket LIKE @DescripcionTicket");
                vParameters.Add("DescripcionTicket",$"%{descripcionTicket}%");
            }
            if (!string.IsNullOrWhiteSpace(nombreSolicitante))
            {
                vSql.Append(" AND NombreSolicitante LIKE @NombreSolicitante");
                vParameters.Add("NombreSolicitante",$"%{nombreSolicitante}%");
            }
            if (!string.IsNullOrWhiteSpace(prioridadTicket))
            {
                vSql.Append(" AND PrioridadTicket LIKE @PrioridadTicket");
                vParameters.Add("PrioridadTicket",$"%{prioridadTicket}%");
            }
            if (!string.IsNullOrWhiteSpace(estadoTicket))
            {
                vSql.Append(" AND EstadoTicket LIKE @EstadoTicket");
                vParameters.Add("EstadoTicket",$"%{estadoTicket}%");
            }
            if (bEliminado.HasValue)
            {
                vSql.Append(" AND bEliminado = @bEliminado");
                vParameters.Add("bEliminado", bEliminado.Value);
            }
            var vList = await _objDbDefault.QueryAsync<dynamic>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<clReadTickets> CreateTickets(clCreateTickets objInput, int userId, string windowName)
        {
            string sInsertSql = $@"
                --WindowName:{windowName},UserID:{userId}
                INSERT INTO tkt.Tickets
                (TituloTicket, DescripcionTicket, UsuarioSolicitanteID, PrioridadTicketID, EstadoTicketID, FechaCreacionTicket, FechaCierre, bEliminado, Creado, UsuarioCreacionID, FechaCreacion)
                VALUES (@TituloTicket, @DescripcionTicket, @UsuarioSolicitanteID, @PrioridadTicketID, @EstadoTicketID, @FechaCreacionTicket, @FechaCierre, @bEliminado, @Creado, @UsuarioCreacionID, GETDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            ";
            var vInsertParams = new
            {
                objInput.TituloTicket,
                objInput.DescripcionTicket,
                objInput.UsuarioSolicitanteID,
                objInput.PrioridadTicketID,
                objInput.EstadoTicketID,
                objInput.FechaCreacionTicket,
                objInput.FechaCierre,
                objInput.bEliminado,
                Creado     = windowName,
                UsuarioCreacionID = userId
            };
            var vNewId = await _objDbDefault.ExecuteScalarAsync<int>(sInsertSql, vInsertParams);
            string sSelectSql = @"
                SELECT TicketID, TituloTicket, DescripcionTicket, UsuarioSolicitanteID, NombreSolicitante, PrioridadTicketID, PrioridadTicket, EstadoTicketID, EstadoTicket, FechaCreacionTicket, FechaCierre, bEliminado
                FROM tkt.vsTickets (NOLOCK)
                WHERE TicketID = @TicketID;";
            var vReadParams = new { TicketID = vNewId };
            var vCreated = await _objDbDefault.QuerySingleOrDefaultAsync<clReadTickets>(sSelectSql, vReadParams);
            if (vCreated is null) throw new InvalidOperationException($"No se pudo recuperar el Ticket con ID {vNewId}.");
            return vCreated;
        }

        public async Task<clReadTickets?> UpdateTickets(clUpdateTickets objInput, int userId, string windowName)
        {
            var vSets = new List<string>();
            var vParameters = new DynamicParameters();
            vParameters.Add("TicketID", objInput.TicketID);
            if (objInput.TituloTicket is not null)
            {
                vSets.Add("TituloTicket = @TituloTicket");
                vParameters.Add("TituloTicket", objInput.TituloTicket);
            }
            if (objInput.DescripcionTicket is not null)
            {
                vSets.Add("DescripcionTicket = @DescripcionTicket");
                vParameters.Add("DescripcionTicket", objInput.DescripcionTicket);
            }
            if (objInput.UsuarioSolicitanteID != null)
            {
                vSets.Add("UsuarioSolicitanteID = @UsuarioSolicitanteID");
                vParameters.Add("UsuarioSolicitanteID", objInput.UsuarioSolicitanteID);
            }
            if (objInput.PrioridadTicketID != null)
            {
                vSets.Add("PrioridadTicketID = @PrioridadTicketID");
                vParameters.Add("PrioridadTicketID", objInput.PrioridadTicketID);
            }
            if (objInput.EstadoTicketID != null)
            {
                vSets.Add("EstadoTicketID = @EstadoTicketID");
                vParameters.Add("EstadoTicketID", objInput.EstadoTicketID);
            }
            if (objInput.FechaCreacionTicket != null)
            {
                vSets.Add("FechaCreacionTicket = @FechaCreacionTicket");
                vParameters.Add("FechaCreacionTicket", objInput.FechaCreacionTicket);
            }
            if (objInput.FechaCierre != null)
            {
                vSets.Add("FechaCierre = @FechaCierre");
                vParameters.Add("FechaCierre", objInput.FechaCierre);
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
                UPDATE tkt.Tickets
                SET {vSetClause}
                WHERE TicketID = @TicketID;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, vParameters);
            if (vAffected == 0) return null;
            const string sSelect = @"
                SELECT TicketID, TituloTicket, DescripcionTicket, UsuarioSolicitanteID, NombreSolicitante, PrioridadTicketID, PrioridadTicket, EstadoTicketID, EstadoTicket, FechaCreacionTicket, FechaCierre, bEliminado
                FROM tkt.vsTickets (NOLOCK)
                WHERE TicketID = @TicketID;";
            return await _objDbDefault.QueryFirstOrDefaultAsync<clReadTickets>(sSelect, new {  objInput.TicketID });
        }

        public async Task<bool> DeleteTickets(int nTicketsID)
        {
            const string sSql = @"
                DELETE FROM tkt.Tickets
                WHERE TicketID = @Id;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, new { Id = nTicketsID });
            return vAffected > 0;
        }

        public async Task<clReadTickets> ChangeEstadoTicket(int ticketID, int nuevoEstadoTicketID, int userId, string windowName)
        {
            // 1) Obtener estado actual del ticket
            const string sGetSql = @"
                SELECT t.EstadoTicketID, e.EstadoTicket AS EstadoActual,
                       n.EstadoTicket AS EstadoNuevo,
                       t.UsuarioSolicitanteID, t.TituloTicket
                FROM tkt.Tickets t (NOLOCK)
                JOIN tkt.EstadosTickets e (NOLOCK) ON e.EstadoTicketID = t.EstadoTicketID
                JOIN tkt.EstadosTickets n (NOLOCK) ON n.EstadoTicketID = @NuevoEstadoID
                WHERE t.TicketID = @TicketID;";

            var ctx = await _objDbDefault.QuerySingleOrDefaultAsync<dynamic>(sGetSql, new
            {
                TicketID = ticketID,
                NuevoEstadoID = nuevoEstadoTicketID
            });

            if (ctx is null)
                throw new System.Collections.Generic.KeyNotFoundException($"Ticket {ticketID} no encontrado.");

            string estadoActual = ctx.EstadoActual;
            string estadoNuevo  = ctx.EstadoNuevo;

            // 2) Validar transición
            if (!TicketStatusTransitions.IsValid(estadoActual, estadoNuevo))
            {
                var permitidos = TicketStatusTransitions.GetAllowed(estadoActual);
                var lista = permitidos.Any() ? string.Join(", ", permitidos) : "ninguno (estado terminal)";
                throw new InvalidOperationException(
                    $"Transición inválida: '{estadoActual}' → '{estadoNuevo}'. " +
                    $"Transiciones permitidas desde '{estadoActual}': {lista}.");
            }

            // 3) Actualizar estado + FechaCierre si cierra
            var sSetsExtra = estadoNuevo.Equals("Cerrado", StringComparison.OrdinalIgnoreCase)
                ? ", FechaCierre = GETDATE()"
                : "";

            var sUpdateSql = $@"
                --WindowName:{windowName},UserID:{userId}
                UPDATE tkt.Tickets
                SET EstadoTicketID       = @NuevoEstadoID,
                    Modificado           = @Modificado,
                    UsuarioModificacionID = @UsuarioModID,
                    FechaModificacion    = GETDATE()
                    {sSetsExtra}
                WHERE TicketID = @TicketID;";

            await _objDbDefault.ExecuteAsync(sUpdateSql, new
            {
                NuevoEstadoID = nuevoEstadoTicketID,
                Modificado    = windowName,
                UsuarioModID  = userId,
                TicketID      = ticketID
            });

            // 4) Generar notificación al solicitante
            int solicitanteID = (int)ctx.UsuarioSolicitanteID;
            string titulo     = (string)ctx.TituloTicket;
            const string sNotifSql = @"
                INSERT INTO ntf.Notificaciones
                    (UsuarioID, Titulo, Mensaje, Leido, FechaCreacionNotificacion, TipoNotificacionID, bEliminado, Creado, UsuarioCreacionID, FechaCreacion)
                VALUES
                    (@UsuarioID, @Titulo, @Mensaje, 0, GETDATE(), NULL, 0, @Creado, @UserID, GETDATE());";

            await _objDbDefault.ExecuteAsync(sNotifSql, new
            {
                UsuarioID = solicitanteID,
                Titulo    = $"Ticket actualizado: {titulo}",
                Mensaje   = $"Tu ticket '{titulo}' cambió de estado: {estadoActual} → {estadoNuevo}.",
                Creado    = windowName,
                UserID    = userId
            });

            // 5) Retornar ticket actualizado
            const string sSelect = @"
                SELECT TicketID, TituloTicket, DescripcionTicket, UsuarioSolicitanteID, NombreSolicitante,
                       PrioridadTicketID, PrioridadTicket, EstadoTicketID, EstadoTicket,
                       FechaCreacionTicket, FechaCierre, bEliminado
                FROM tkt.vsTickets (NOLOCK)
                WHERE TicketID = @TicketID;";

            var result = await _objDbDefault.QuerySingleOrDefaultAsync<clReadTickets>(sSelect, new { TicketID = ticketID });
            if (result is null)
                throw new InvalidOperationException($"No se pudo recuperar el Ticket {ticketID} tras el cambio de estado.");

            return result;
        }
    }
}
