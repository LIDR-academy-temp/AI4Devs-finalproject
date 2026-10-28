using System.Data;
using System.Text;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using GraphApi.Infrastructure;
using GraphApi.Models.USR.Mascotas;

namespace GraphApi.Services.USR.Mascotas
{
    public class MascotasService : IMascotasService
    {
        private readonly IDbConnection   _objDbDefault;
        private readonly IConfiguration  _objConfig;

        public MascotasService(IDbConnection objDbDefault, IConfiguration objConfig)
        {
            _objDbDefault = objDbDefault;
            _objConfig    = objConfig;
        }

        public async Task<IEnumerable<clReadMascotas>> GetMascotas(
            int userId,
            string windowName)
        {
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT MascotaID, UsuarioID, NombreUsuario, CorreoUsuario, NombreMascota, TipoMascotaID, TipoMascota, RazaMascotaID, RazaLibre, RazaMascota, FechaNacimiento, bEliminado
                FROM usr.vsMascotas (NOLOCK)
            ");
            var vParameters = new DynamicParameters();
            var vList = await _objDbDefault.QueryAsync<clReadMascotas>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<IEnumerable<dynamic>> GetMascotasDynamic(
            int? mascotaID,
            int? usuarioID,
            string? nombreUsuario,
            string? correoUsuario,
            string? nombreMascota,
            int? tipoMascotaID,
            string? tipoMascota,
            int? razaMascotaID,
            string? razaMascota,
            DateTime? fechaNacimiento,
            bool? bEliminado,
            string? columnNames,
            int userId,
            string windowName)
        {
            string sColumnNames = string.IsNullOrWhiteSpace(columnNames) ? "MascotaID, UsuarioID, NombreUsuario, CorreoUsuario, NombreMascota, TipoMascotaID, TipoMascota, RazaMascotaID, RazaLibre, RazaMascota, FechaNacimiento, bEliminado" : columnNames;
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT {sColumnNames}
                FROM usr.vsMascotas (NOLOCK)
                WHERE 1=1
            ");
            var vParameters = new DynamicParameters();
            if (mascotaID.HasValue)
            {
                vSql.Append(" AND MascotaID = @MascotaID");
                vParameters.Add("MascotaID",mascotaID);
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
            if (!string.IsNullOrWhiteSpace(nombreMascota))
            {
                vSql.Append(" AND NombreMascota LIKE @NombreMascota");
                vParameters.Add("NombreMascota",$"%{nombreMascota}%");
            }
            if (!string.IsNullOrWhiteSpace(tipoMascota))
            {
                vSql.Append(" AND TipoMascota LIKE @TipoMascota");
                vParameters.Add("TipoMascota",$"%{tipoMascota}%");
            }
            if (!string.IsNullOrWhiteSpace(razaMascota))
            {
                vSql.Append(" AND RazaMascota LIKE @RazaMascota");
                vParameters.Add("RazaMascota",$"%{razaMascota}%");
            }
            if (bEliminado.HasValue)
            {
                vSql.Append(" AND bEliminado = @bEliminado");
                vParameters.Add("bEliminado", bEliminado.Value);
            }
            var vList = await _objDbDefault.QueryAsync<dynamic>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<clReadMascotas> CreateMascotas(clCreateMascotas objInput, int userId, string windowName)
        {
            var nombreCol = SqlSchemaCompat.MascotaNombreColumnName(_objDbDefault);
            string sInsertSql = $@"
                --WindowName:{windowName},UserID:{userId}
                INSERT INTO usr.Mascotas
                (UsuarioID, {nombreCol}, TipoMascotaID, RazaMascotaID, RazaLibre, FechaNacimiento, bEliminado, Creado, UsuarioCreacionID, FechaCreacion)
                VALUES (@UsuarioID, @NombreMascota, @TipoMascotaID, @RazaMascotaID, @RazaLibre, @FechaNacimiento, @bEliminado, @Creado, @UsuarioCreacionID, GETDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            ";
            var vInsertParams = new
            {
                UsuarioID = userId,
                objInput.NombreMascota,
                objInput.TipoMascotaID,
                objInput.RazaMascotaID,
                objInput.RazaLibre,
                objInput.FechaNacimiento,
                objInput.bEliminado,
                Creado     = windowName,
                UsuarioCreacionID = userId
            };
            var vNewId = await _objDbDefault.ExecuteScalarAsync<int>(sInsertSql, vInsertParams);
            string sSelectSql = @"
                SELECT MascotaID, UsuarioID, NombreUsuario, CorreoUsuario, NombreMascota, TipoMascotaID, TipoMascota, RazaMascotaID, RazaLibre, RazaMascota, FechaNacimiento, bEliminado
                FROM usr.vsMascotas (NOLOCK)
                WHERE MascotaID = @MascotaID;";
            var vReadParams = new { MascotaID = vNewId };
            var vCreated = await _objDbDefault.QuerySingleOrDefaultAsync<clReadMascotas>(sSelectSql, vReadParams);
            if (vCreated is null)
            {
                // Fallback: la vista usr.vsMascotas puede excluir filas cuando algunos FK son NULL
                // (p.ej. TipoMascotaID o RazaMascotaID). Intentamos leer directamente desde la tabla
                // con LEFT JOINs para no depender de la vista.
                var (nombreUsuario, correoUsuario, _) = SqlSchemaCompat.UsuarioColumns(_objDbDefault, "U");
                var mascotaNombre = SqlSchemaCompat.MascotaNombreColumn(_objDbDefault, "M");
                var sFallback = $@"
                    SELECT M.MascotaID,
                           M.UsuarioID,
                           {nombreUsuario} AS NombreUsuario,
                           {correoUsuario} AS CorreoUsuario,
                           {mascotaNombre} AS NombreMascota,
                           M.TipoMascotaID,
                           TM.TipoMascota,
                           M.RazaMascotaID,
                           M.RazaLibre,
                           COALESCE(M.RazaLibre, RM.RazaMascota) AS RazaMascota,
                           M.FechaNacimiento,
                           M.bEliminado
                    FROM usr.Mascotas M (NOLOCK)
                    LEFT JOIN sgr.Usuarios U (NOLOCK) ON U.UsuarioID = M.UsuarioID
                    LEFT JOIN usr.TiposMascota TM (NOLOCK) ON TM.TipoMascotaID = M.TipoMascotaID
                    LEFT JOIN usr.RazasMascota RM (NOLOCK) ON RM.RazaMascotaID = M.RazaMascotaID
                    WHERE M.MascotaID = @MascotaID;";

                var vFallback = await _objDbDefault.QuerySingleOrDefaultAsync<clReadMascotas>(sFallback, vReadParams);
                if (vFallback is null) throw new InvalidOperationException($"No se pudo recuperar el Mascota con ID {vNewId}.");
                return vFallback;
            }

            return vCreated;
        }

        public async Task<clReadMascotas?> UpdateMascotas(clUpdateMascotas objInput, int userId, string windowName)
        {
            var vSets = new List<string>();
            var vParameters = new DynamicParameters();
            vParameters.Add("MascotaID", objInput.MascotaID);
            if (objInput.UsuarioID != null)
            {
                vSets.Add("UsuarioID = @UsuarioID");
                vParameters.Add("UsuarioID", objInput.UsuarioID);
            }
            if (objInput.NombreMascota is not null)
            {
                var nombreCol = SqlSchemaCompat.MascotaNombreColumnName(_objDbDefault);
                vSets.Add($"{nombreCol} = @NombreMascota");
                vParameters.Add("NombreMascota", objInput.NombreMascota);
            }
            if (objInput.TipoMascotaID != null)
            {
                vSets.Add("TipoMascotaID = @TipoMascotaID");
                vParameters.Add("TipoMascotaID", objInput.TipoMascotaID);
            }
            if (objInput.RazaMascotaID != null)
            {
                vSets.Add("RazaMascotaID = @RazaMascotaID");
                vParameters.Add("RazaMascotaID", objInput.RazaMascotaID);
            }
            if (objInput.RazaLibre is not null)
            {
                vSets.Add("RazaLibre = @RazaLibre");
                vParameters.Add("RazaLibre", objInput.RazaLibre);
            }
            if (objInput.FechaNacimiento != null)
            {
                vSets.Add("FechaNacimiento = @FechaNacimiento");
                vParameters.Add("FechaNacimiento", objInput.FechaNacimiento);
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
                UPDATE usr.Mascotas
                SET {vSetClause}
                WHERE MascotaID = @MascotaID;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, vParameters);
            if (vAffected == 0) return null;
            const string sSelect = @"
                SELECT MascotaID, UsuarioID, NombreUsuario, CorreoUsuario, NombreMascota, TipoMascotaID, TipoMascota, RazaMascotaID, RazaLibre, RazaMascota, FechaNacimiento, bEliminado
                FROM usr.vsMascotas (NOLOCK)
                WHERE MascotaID = @MascotaID;";
            return await _objDbDefault.QueryFirstOrDefaultAsync<clReadMascotas>(sSelect, new {  objInput.MascotaID });
        }

        public async Task<bool> DeleteMascotas(int nMascotasID)
        {
            const string sSql = @"
                DELETE FROM usr.Mascotas
                WHERE MascotaID = @Id;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, new { Id = nMascotasID });
            return vAffected > 0;
        }
    }
}
