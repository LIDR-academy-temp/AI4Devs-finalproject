using System.Data;
using System.Text;
using Dapper;
using Microsoft.Data.SqlClient;
using Microsoft.Extensions.Configuration;
using GraphApi.Infrastructure;
using GraphApi.Models.SGR.Usuarios;
using BC = BCrypt.Net.BCrypt;

namespace GraphApi.Services.SGR.Usuarios
{
    public class UsuariosService : IUsuariosService
    {
        private readonly IDbConnection   _objDbDefault;
        private readonly IConfiguration  _objConfig;

        // ADR-008: columnas detectadas una vez en construcción.
        private readonly string _colNombre;
        private readonly string _colCorreo;
        private readonly string _colActivo;
        private readonly string _colTelefono;
        private readonly string _colFotoUrl;
        private readonly string _colPassword;

        public UsuariosService(IDbConnection objDbDefault, IConfiguration objConfig)
        {
            _objDbDefault = objDbDefault;
            _objConfig    = objConfig;
            var (nombre, correo, activo) = SqlSchemaCompat.UsuarioColumns(objDbDefault, "u");
            _colNombre   = nombre.Replace("u.", "");
            _colCorreo   = correo.Replace("u.", "");
            _colActivo   = activo.Replace("u.", "");
            _colTelefono = SqlSchemaCompat.HasColumn(objDbDefault, "sgr", "Usuarios", "Telefono")
                ? "Telefono" : "TelefonoUsuario";
            _colFotoUrl  = SqlSchemaCompat.HasColumn(objDbDefault, "sgr", "Usuarios", "FotoUrl")
                ? "FotoUrl" : "FotoUrlUsuario";
            _colPassword = SqlSchemaCompat.HasColumn(objDbDefault, "sgr", "Usuarios", "Password")
                ? "Password" : "PasswordUsuario";
        }

        public async Task<IEnumerable<clReadUsuarios>> GetUsuarios(
            int userId,
            string windowName)
        {
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT  * 
                FROM sgr.vsUsuarios (NOLOCK)
            ");
            var vParameters = new DynamicParameters();
            var vList = await _objDbDefault.QueryAsync<clReadUsuarios>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<IEnumerable<dynamic>> GetUsuariosDynamic(
            int? usuarioID,
            string? correoUsuario,
            int? perfilID,
            string? perfil,
            bool? bAdministrador,
            string? nombreUsuario,
            string? telefonoUsuario,
            string? fotoUrlUsuario,
            bool? bActivoUsuario,
            bool? bEliminado,
            bool? bActualizarPassword,
            string? columnNames,
            int userId,
            string windowName)
        {
            // PasswordUsuario excluded from default columns — never expose hashed passwords via API
            string sColumnNames = string.IsNullOrWhiteSpace(columnNames) ? "UsuarioID, CorreoUsuario, PerfilID, Perfil, bAdministrador, NombreUsuario, TelefonoUsuario, FotoUrlUsuario, bActivoUsuario, bEliminado, bActualizarPassword" : columnNames;
            var vSql = new StringBuilder($@"
                --WindowName:{windowName},UserID:{userId}
                SELECT {sColumnNames}
                FROM sgr.vsUsuarios (NOLOCK)
                WHERE 1=1
            ");
            var vParameters = new DynamicParameters();
            if (usuarioID.HasValue)
            {
                vSql.Append(" AND UsuarioID = @UsuarioID");
                vParameters.Add("UsuarioID",usuarioID);
            }
            if (!string.IsNullOrWhiteSpace(correoUsuario))
            {
                vSql.Append(" AND CorreoUsuario LIKE @CorreoUsuario");
                vParameters.Add("CorreoUsuario",$"%{correoUsuario}%");
            }
            if (!string.IsNullOrWhiteSpace(perfil))
            {
                vSql.Append(" AND Perfil LIKE @Perfil");
                vParameters.Add("Perfil",$"%{perfil}%");
            }
            if (bAdministrador.HasValue)
            {
                vSql.Append(" AND bAdministrador = @bAdministrador");
                vParameters.Add("bAdministrador", bAdministrador.Value);
            }
            if (!string.IsNullOrWhiteSpace(nombreUsuario))
            {
                vSql.Append(" AND NombreUsuario LIKE @NombreUsuario");
                vParameters.Add("NombreUsuario",$"%{nombreUsuario}%");
            }
            if (!string.IsNullOrWhiteSpace(telefonoUsuario))
            {
                vSql.Append(" AND TelefonoUsuario LIKE @TelefonoUsuario");
                vParameters.Add("TelefonoUsuario",$"%{telefonoUsuario}%");
            }
            if (!string.IsNullOrWhiteSpace(fotoUrlUsuario))
            {
                vSql.Append(" AND FotoUrlUsuario LIKE @FotoUrlUsuario");
                vParameters.Add("FotoUrlUsuario",$"%{fotoUrlUsuario}%");
            }
            if (bActivoUsuario.HasValue)
            {
                vSql.Append(" AND bActivoUsuario = @bActivoUsuario");
                vParameters.Add("bActivoUsuario", bActivoUsuario.Value);
            }
            if (bEliminado.HasValue)
            {
                vSql.Append(" AND bEliminado = @bEliminado");
                vParameters.Add("bEliminado", bEliminado.Value);
            }
            if (bActualizarPassword.HasValue)
            {
                vSql.Append(" AND bActualizarPassword = @bActualizarPassword");
                vParameters.Add("bActualizarPassword", bActualizarPassword.Value);
            }
            var vList = await _objDbDefault.QueryAsync<dynamic>(vSql.ToString(), vParameters);
            return vList;
        }

        public async Task<clReadUsuarios> CreateUsuarios(clCreateUsuarios objInput, int userId, string windowName)
        {
            // Hash password before storing — never store plaintext
            var hashedPassword = BC.HashPassword(objInput.PasswordUsuario);

            string sInsertSql = $@"
                --WindowName:{windowName},UserID:{userId}
                INSERT INTO sgr.Usuarios
                ({_colCorreo}, PerfilID, {_colPassword}, {_colNombre}, {_colActivo}, {_colTelefono}, {_colFotoUrl}, bEliminado, bActualizarPassword, Creado, UsuarioCreacionID, FechaCreacion)
                VALUES (@CorreoUsuario, @PerfilID, @PasswordUsuario, @NombreUsuario, @bActivoUsuario, @TelefonoUsuario, @FotoUrlUsuario, @bEliminado, @bActualizarPassword, @Creado, @UsuarioCreacionID, GETDATE());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
            ";
            var vInsertParams = new
            {
                CorreoUsuario = objInput.CorreoUsuario,
                objInput.PerfilID,
                PasswordUsuario = hashedPassword,
                NombreUsuario = objInput.NombreUsuario,
                bActivoUsuario = objInput.bActivoUsuario,
                TelefonoUsuario = objInput.TelefonoUsuario,
                FotoUrlUsuario = objInput.FotoUrlUsuario,
                bEliminado = objInput.bEliminado,
                bActualizarPassword = objInput.bActualizarPassword,
                Creado     = windowName,
                UsuarioCreacionID = userId
            };
            var vNewId = await _objDbDefault.ExecuteScalarAsync<int>(sInsertSql, vInsertParams);
            string sSelectSql = @"
                SELECT UsuarioID, CorreoUsuario, PerfilID, Perfil, bAdministrador, PasswordUsuario, NombreUsuario, TelefonoUsuario, FotoUrlUsuario, bActivoUsuario, bEliminado, bActualizarPassword
                FROM sgr.vsUsuarios (NOLOCK)
                WHERE UsuarioID = @UsuarioID;";
            var vReadParams = new { UsuarioID = vNewId };
            var vCreated = await _objDbDefault.QuerySingleOrDefaultAsync<clReadUsuarios>(sSelectSql, vReadParams);
            if (vCreated is null) throw new InvalidOperationException($"No se pudo recuperar el Usuario con ID {vNewId}.");
            return vCreated;
        }

        public async Task<clReadUsuarios?> UpdateUsuarios(clUpdateUsuarios objInput, int userId, string windowName)
        {
            var vSets = new List<string>();
            var vParameters = new DynamicParameters();
            vParameters.Add("UsuarioID", objInput.UsuarioID);
            if (objInput.CorreoUsuario is not null)
            {
                vSets.Add($"{_colCorreo} = @CorreoUsuario");
                vParameters.Add("CorreoUsuario", objInput.CorreoUsuario);
            }
            if (objInput.PerfilID != null)
            {
                vSets.Add("PerfilID = @PerfilID");
                vParameters.Add("PerfilID", objInput.PerfilID);
            }
            if (objInput.PasswordUsuario is not null)
            {
                vSets.Add("PasswordUsuario = @PasswordUsuario");
                // Hash the new password before storing
                vParameters.Add("PasswordUsuario", BC.HashPassword(objInput.PasswordUsuario));
            }
            if (objInput.NombreUsuario is not null)
            {
                vSets.Add($"{_colNombre} = @NombreUsuario");
                vParameters.Add("NombreUsuario", objInput.NombreUsuario);
            }
            if (objInput.bActivoUsuario != null)
            {
                vSets.Add($"{_colActivo} = @bActivoUsuario");
                vParameters.Add("bActivoUsuario", objInput.bActivoUsuario);
            }
            if (objInput.TelefonoUsuario is not null)
            {
                vSets.Add($"{_colTelefono} = @TelefonoUsuario");
                vParameters.Add("TelefonoUsuario", objInput.TelefonoUsuario);
            }
            if (objInput.FotoUrlUsuario is not null)
            {
                vSets.Add($"{_colFotoUrl} = @FotoUrlUsuario");
                vParameters.Add("FotoUrlUsuario", objInput.FotoUrlUsuario);
            }
            if (objInput.bEliminado != null)
            {
                vSets.Add("bEliminado = @bEliminado");
                vParameters.Add("bEliminado", objInput.bEliminado);
            }
            if (objInput.bActualizarPassword != null)
            {
                vSets.Add("bActualizarPassword = @bActualizarPassword");
                vParameters.Add("bActualizarPassword", objInput.bActualizarPassword);
            }
            vSets.Add($"Modificado = '{windowName}'");
            vSets.Add($"UsuarioModificacionID = {userId}");
            vSets.Add("FechaModificacion = GETDATE()");
            var vSetClause = string.Join(", ", vSets);
            var sSql = $@"
                --WindowName:{windowName},UserID:{userId}
                UPDATE sgr.Usuarios
                SET {vSetClause}
                WHERE UsuarioID = @UsuarioID;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, vParameters);
            if (vAffected == 0) return null;
            const string sSelect = @"
                SELECT UsuarioID, CorreoUsuario, PerfilID, Perfil, bAdministrador, PasswordUsuario, NombreUsuario, TelefonoUsuario, FotoUrlUsuario, bActivoUsuario, bEliminado, bActualizarPassword
                FROM sgr.vsUsuarios (NOLOCK)
                WHERE UsuarioID = @UsuarioID;";
            return await _objDbDefault.QueryFirstOrDefaultAsync<clReadUsuarios>(sSelect, new {  objInput.UsuarioID });
        }

        public async Task<bool> DeleteUsuarios(int nUsuariosID)
        {
            const string sSql = @"
                DELETE FROM sgr.Usuarios
                WHERE UsuarioID = @Id;";
            var vAffected = await _objDbDefault.ExecuteAsync(sSql, new { Id = nUsuariosID });
            return vAffected > 0;
        }
    }
}
