using System.Data;
using System.Text;
using Dapper;
using HotChocolate;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using GraphApi.Models.VTS.ReservacionesArea;

namespace GraphApi.Services.VTS.ReservacionesArea
{
    public class ReservacionesAreaService : IReservacionesAreaService
    {
        private readonly IDbConnection   _objDbDefault;
        private readonly IConfiguration  _objConfig;

        public ReservacionesAreaService(IDbConnection objDbDefault, IConfiguration objConfig)
        {
            _objDbDefault = objDbDefault;
            _objConfig    = objConfig;
        }

        private static bool IsBlockingReservacionState(string? reservacionEstado)
        {
            if (string.IsNullOrWhiteSpace(reservacionEstado))
            {
                return true;
            }

            return !reservacionEstado.Equals("Cancelada", StringComparison.OrdinalIgnoreCase)
                && !reservacionEstado.Equals("Finalizada", StringComparison.OrdinalIgnoreCase);
        }

        private async Task<AreaReservacionLookup?> GetAreaReservacionAsync(int areasComunesID)
        {
            const string sSql = @"
                SELECT AreasComunesID, AreasComunes, RequiereReservacion, bEliminado
                FROM vts.AreasComunes (NOLOCK)
                WHERE AreasComunesID = @AreasComunesID;";

            return await _objDbDefault.QueryFirstOrDefaultAsync<AreaReservacionLookup>(sSql, new { AreasComunesID = areasComunesID });
        }

        private async Task<ReservacionEstadoLookup?> GetReservacionEstadoAsync(int reservacionEstadoID)
        {
            const string sSql = @"
                SELECT ReservacionEstadoID, ReservacionEstado, bEliminado
                FROM vts.ReservacionesEstados (NOLOCK)
                WHERE ReservacionEstadoID = @ReservacionEstadoID;";

            return await _objDbDefault.QueryFirstOrDefaultAsync<ReservacionEstadoLookup>(sSql, new { ReservacionEstadoID = reservacionEstadoID });
        }

        private async Task<clReadReservacionesArea?> GetReservacionByIdAsync(int reservacionAreaID)
        {
            const string sSql = @"
                SELECT ReservacionAreaID, AreasComunesID, AreasComunes, Capacidad, RequiereReservacion, UsuarioID, NombreUsuario, CorreoUsuario, FechaInicio, FechaFin, ReservacionEstadoID, ReservacionEstado, bEliminado
                FROM vts.vsReservacionesArea (NOLOCK)
                WHERE ReservacionAreaID = @ReservacionAreaID;";

            return await _objDbDefault.QueryFirstOrDefaultAsync<clReadReservacionesArea>(sSql, new { ReservacionAreaID = reservacionAreaID });
        }

        private async Task EnsureReservacionDisponibleAsync(
            int? reservacionAreaID,
            int areasComunesID,
            DateTime fechaInicio,
            DateTime fechaFin,
            int reservacionEstadoID,
            bool bEliminado,
            int userId,
            string windowName)
        {
            if (areasComunesID <= 0)
            {
                throw new GraphQLException("La amenidad seleccionada no es válida.");
            }

            if (fechaFin <= fechaInicio)
            {
                throw new GraphQLException("La fecha de fin debe ser mayor que la fecha de inicio.");
            }

            var vArea = await GetAreaReservacionAsync(areasComunesID);
            if (vArea is null || vArea.bEliminado == true)
            {
                throw new GraphQLException($"La amenidad con ID {areasComunesID} no existe o está eliminada.");
            }

            if (vArea.RequiereReservacion != true)
            {
                throw new GraphQLException($"La amenidad '{vArea.AreasComunes}' no requiere reservación.");
            }

            var vEstado = await GetReservacionEstadoAsync(reservacionEstadoID);
            if (vEstado is null || vEstado.bEliminado == true)
            {
                throw new GraphQLException($"El estado de reservación con ID {reservacionEstadoID} no existe o está eliminado.");
            }

            if (bEliminado || !IsBlockingReservacionState(vEstado.ReservacionEstado))
            {
                return;
            }

            const string sConflictSql = @"
                SELECT TOP 1
                    ra.ReservacionAreaID,
                    ac.AreasComunes,
                    ra.FechaInicio,
                    ra.FechaFin,
                    re.ReservacionEstado
                FROM vts.ReservacionesArea ra
                INNER JOIN vts.AreasComunes ac ON ac.AreasComunesID = ra.AreasComunesID
                INNER JOIN vts.ReservacionesEstados re ON re.ReservacionEstadoID = ra.ReservacionEstadoID
                WHERE ra.AreasComunesID = @AreasComunesID
                  AND ISNULL(ra.bEliminado, 0) = 0
                  AND ISNULL(ac.bEliminado, 0) = 0
                  AND ISNULL(re.bEliminado, 0) = 0
                  AND re.ReservacionEstado NOT IN (N'Cancelada', N'Finalizada')
                  AND ra.FechaInicio < @FechaFin
                  AND ra.FechaFin > @FechaInicio
                  AND (@ReservacionAreaID IS NULL OR ra.ReservacionAreaID <> @ReservacionAreaID)
                ORDER BY ra.FechaInicio, ra.ReservacionAreaID;";

            var vConflict = await _objDbDefault.QueryFirstOrDefaultAsync<ReservacionConflictLookup>(sConflictSql, new
            {
                AreasComunesID = areasComunesID,
                FechaInicio = fechaInicio,
                FechaFin = fechaFin,
                ReservacionAreaID = reservacionAreaID
            });

            if (vConflict is not null)
            {
                throw new GraphQLException(BuildConflictMessage(vConflict));
            }
        }

        private static string BuildConflictMessage(ReservacionConflictLookup conflict)
        {
            var areaName = string.IsNullOrWhiteSpace(conflict.AreasComunes)
                ? "la amenidad seleccionada"
                : conflict.AreasComunes;

            return $"La amenidad '{areaName}' ya tiene una reserva activa del {conflict.FechaInicio:dd/MM/yyyy HH:mm} al {conflict.FechaFin:dd/MM/yyyy HH:mm}.";
        }

        public async Task<IEnumerable<clReadReservacionesArea>> GetReservacionesAreas(
            int userId,
            string windowName)
        {
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT  * 
                FROM vts.vsReservacionesArea (NOLOCK)
            ");
            var vParameters = new DynamicParameters();
            var vList = await _objDbDefault.QueryAsync<clReadReservacionesArea>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<IEnumerable<dynamic>> GetReservacionesAreasDynamic(
            int? reservacionAreaID,
            int? areasComunesID,
            string? areasComunes,
            int? capacidad,
            bool? requiereReservacion,
            int? usuarioID,
            string? nombreUsuario,
            string? correoUsuario,
            DateTime? fechaInicio,
            DateTime? fechaFin,
            int? reservacionEstadoID,
            string? reservacionEstado,
            bool? bEliminado,
            string? columnNames,
            int userId,
            string windowName)
        {
            string sColumnNames = string.IsNullOrWhiteSpace(columnNames) ? "ReservacionAreaID, AreasComunesID, AreasComunes, Capacidad, RequiereReservacion, UsuarioID, NombreUsuario, CorreoUsuario, FechaInicio, FechaFin, ReservacionEstadoID, ReservacionEstado, bEliminado" : columnNames;
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT {sColumnNames}
                FROM vts.vsReservacionesArea (NOLOCK)
                WHERE 1=1
            ");
            var vParameters = new DynamicParameters();
            if (reservacionAreaID.HasValue)
            {
                vSql.Append(" AND ReservacionAreaID = @ReservacionAreaID");
                vParameters.Add("ReservacionAreaID",reservacionAreaID);
            }
            if (!string.IsNullOrWhiteSpace(areasComunes))
            {
                vSql.Append(" AND AreasComunes LIKE @AreasComunes");
                vParameters.Add("AreasComunes",$"%{areasComunes}%");
            }
            if (requiereReservacion.HasValue)
            {
                vSql.Append(" AND RequiereReservacion = @RequiereReservacion");
                vParameters.Add("RequiereReservacion", requiereReservacion.Value);
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
            if (!string.IsNullOrWhiteSpace(reservacionEstado))
            {
                vSql.Append(" AND ReservacionEstado LIKE @ReservacionEstado");
                vParameters.Add("ReservacionEstado",$"%{reservacionEstado}%");
            }
            if (bEliminado.HasValue)
            {
                vSql.Append(" AND bEliminado = @bEliminado");
                vParameters.Add("bEliminado", bEliminado.Value);
            }
            var vList = await _objDbDefault.QueryAsync<dynamic>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<clReadReservacionesArea> CreateReservacionesArea(clCreateReservacionesArea objInput, int userId, string windowName)
        {
            await EnsureReservacionDisponibleAsync(
                null,
                objInput.AreasComunesID,
                objInput.FechaInicio,
                objInput.FechaFin,
                objInput.ReservacionEstadoID,
                objInput.bEliminado,
                userId,
                windowName);

            string sInsertSql = $@"
                --WindowName:{windowName},UserID:{userId}
                INSERT INTO vts.ReservacionesArea
                (AreasComunesID, UsuarioID, FechaInicio, FechaFin, ReservacionEstadoID, bEliminado, Creado, UsuarioCreacionID, FechaCreacion)
                VALUES (@AreasComunesID, @UsuarioID, @FechaInicio, @FechaFin, @ReservacionEstadoID, @bEliminado, @Creado, @UsuarioCreacionID, GETDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            ";
            var vInsertParams = new
            {
                objInput.AreasComunesID,
                objInput.UsuarioID,
                objInput.FechaInicio,
                objInput.FechaFin,
                objInput.ReservacionEstadoID,
                objInput.bEliminado,
                Creado     = windowName,
                UsuarioCreacionID = userId
            };
            var vNewId = await _objDbDefault.ExecuteScalarAsync<int>(sInsertSql, vInsertParams);
            string sSelectSql = @"
                SELECT ReservacionAreaID, AreasComunesID, AreasComunes, Capacidad, RequiereReservacion, UsuarioID, NombreUsuario, CorreoUsuario, FechaInicio, FechaFin, ReservacionEstadoID, ReservacionEstado, bEliminado
                FROM vts.vsReservacionesArea (NOLOCK)
                WHERE ReservacionAreaID = @ReservacionAreaID;";
            var vReadParams = new { ReservacionAreaID = vNewId };
            var vCreated = await _objDbDefault.QuerySingleOrDefaultAsync<clReadReservacionesArea>(sSelectSql, vReadParams);
            if (vCreated is null) throw new InvalidOperationException($"No se pudo recuperar el ReservacionesArea con ID {vNewId}.");
            return vCreated;
        }

        public async Task<clReadReservacionesArea?> UpdateReservacionesArea(clUpdateReservacionesArea objInput, int userId, string windowName)
        {
            if (!objInput.ReservacionAreaID.HasValue || objInput.ReservacionAreaID.Value <= 0)
            {
                throw new GraphQLException("Debe indicar un ReservacionAreaID válido para actualizar.");
            }

            var vCurrent = await GetReservacionByIdAsync(objInput.ReservacionAreaID.Value);
            if (vCurrent is null)
            {
                return null;
            }

            int vEffectiveAreasComunesID = objInput.AreasComunesID ?? vCurrent.AreasComunesID
                ?? throw new InvalidOperationException("La reserva actual no tiene una amenidad asociada.");
            DateTime vEffectiveFechaInicio = objInput.FechaInicio ?? vCurrent.FechaInicio
                ?? throw new InvalidOperationException("La reserva actual no tiene FechaInicio registrada.");
            DateTime vEffectiveFechaFin = objInput.FechaFin ?? vCurrent.FechaFin
                ?? throw new InvalidOperationException("La reserva actual no tiene FechaFin registrada.");
            int vEffectiveReservacionEstadoID = objInput.ReservacionEstadoID ?? vCurrent.ReservacionEstadoID
                ?? throw new InvalidOperationException("La reserva actual no tiene un estado asociado.");
            bool vEffectiveBEliminado = objInput.bEliminado ?? vCurrent.bEliminado ?? false;

            await EnsureReservacionDisponibleAsync(
                objInput.ReservacionAreaID,
                vEffectiveAreasComunesID,
                vEffectiveFechaInicio,
                vEffectiveFechaFin,
                vEffectiveReservacionEstadoID,
                vEffectiveBEliminado,
                userId,
                windowName);

            var vSets = new List<string>();
            var vParameters = new DynamicParameters();
            vParameters.Add("ReservacionAreaID", objInput.ReservacionAreaID.Value);
            if (objInput.AreasComunesID != null)
            {
                vSets.Add("AreasComunesID = @AreasComunesID");
                vParameters.Add("AreasComunesID", objInput.AreasComunesID);
            }
            if (objInput.UsuarioID != null)
            {
                vSets.Add("UsuarioID = @UsuarioID");
                vParameters.Add("UsuarioID", objInput.UsuarioID);
            }
            if (objInput.FechaInicio != null)
            {
                vSets.Add("FechaInicio = @FechaInicio");
                vParameters.Add("FechaInicio", objInput.FechaInicio);
            }
            if (objInput.FechaFin != null)
            {
                vSets.Add("FechaFin = @FechaFin");
                vParameters.Add("FechaFin", objInput.FechaFin);
            }
            if (objInput.ReservacionEstadoID != null)
            {
                vSets.Add("ReservacionEstadoID = @ReservacionEstadoID");
                vParameters.Add("ReservacionEstadoID", objInput.ReservacionEstadoID);
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
                UPDATE vts.ReservacionesArea
                SET {vSetClause}
                WHERE ReservacionAreaID = @ReservacionAreaID;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, vParameters);
            if (vAffected == 0) return null;
            const string sSelect = @"
                SELECT ReservacionAreaID, AreasComunesID, AreasComunes, Capacidad, RequiereReservacion, UsuarioID, NombreUsuario, CorreoUsuario, FechaInicio, FechaFin, ReservacionEstadoID, ReservacionEstado, bEliminado
                FROM vts.vsReservacionesArea (NOLOCK)
                WHERE ReservacionAreaID = @ReservacionAreaID;";
            return await _objDbDefault.QueryFirstOrDefaultAsync<clReadReservacionesArea>(sSelect, new { ReservacionAreaID = objInput.ReservacionAreaID.Value });
        }

        public async Task<bool> DeleteReservacionesArea(int nReservacionesAreaID)
        {
            const string sSql = @"
                DELETE FROM vts.ReservacionesArea
                WHERE ReservacionAreaID = @Id;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, new { Id = nReservacionesAreaID });
            return vAffected > 0;
        }

        private sealed class AreaReservacionLookup
        {
            public int AreasComunesID { get; set; }
            public string? AreasComunes { get; set; }
            public bool RequiereReservacion { get; set; }
            public bool? bEliminado { get; set; }
        }

        private sealed class ReservacionEstadoLookup
        {
            public int ReservacionEstadoID { get; set; }
            public string? ReservacionEstado { get; set; }
            public bool? bEliminado { get; set; }
        }

        private sealed class ReservacionConflictLookup
        {
            public int ReservacionAreaID { get; set; }
            public string? AreasComunes { get; set; }
            public DateTime FechaInicio { get; set; }
            public DateTime FechaFin { get; set; }
            public string? ReservacionEstado { get; set; }
        }
    }
}
