using GraphApi.Models.SGR.Usuarios;

namespace GraphApi.Services.SGR.Usuarios
{
    /// <summary>
    /// Define las operaciones de negocio y persistencia para Usuarios.
    /// </summary>
    public interface IUsuariosService
    {
        /// <summary>
        /// Obtiene la lista de Usuarios con filtros opcionales.
        /// </summary>
        /// <param name="userId">ID de usuario (cabecera “UserID”).</param>
        /// <param name="windowName">Nombre de aplicación (cabecera “WindowName”).</param>
        Task<IEnumerable<clReadUsuarios>> GetUsuarios(
            int userId,
            string windowName);

        /// <summary>
        /// Obtiene la lista dinámica de Usuarios con filtros opcionales.
        /// </summary>
        /// <param name="usuarioID">Filtro opcional para UsuarioID.</param>
        /// <param name="correoUsuario">Filtro opcional para CorreoUsuario.</param>
        /// <param name="perfilID">Filtro opcional para PerfilID.</param>
        /// <param name="perfil">Filtro opcional para Perfil.</param>
        /// <param name="bAdministrador">Filtro opcional para bAdministrador.</param>
        /// <param name="passwordUsuario">Filtro opcional para PasswordUsuario.</param>
        /// <param name="nombreUsuario">Filtro opcional para NombreUsuario.</param>
        /// <param name="telefonoUsuario">Filtro opcional para TelefonoUsuario.</param>
        /// <param name="fotoUrlUsuario">Filtro opcional para FotoUrlUsuario.</param>
        /// <param name="bActivoUsuario">Filtro opcional para bActivoUsuario.</param>
        /// <param name="bEliminado">Filtro opcional para bEliminado.</param>
        /// <param name="bActualizarPassword">Filtro opcional para bActualizarPassword.</param>
        /// <param name="columnNames">Nombres de columnas a retornar (separados por coma). Si es null o vacío, retorna columna por defecto.</param>
        /// <param name="userId">ID de usuario (cabecera “UserID”).</param>
        /// <param name="windowName">Nombre de aplicación (cabecera “WindowName”).</param>
        Task<IEnumerable<dynamic>> GetUsuariosDynamic(
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
            string windowName);

        /// <summary>
        /// Crea un nuevo Usuario.
        /// </summary>
        /// <param name="objInput">Datos para crear el Usuario.</param>
        /// <param name="userId">ID de usuario (cabecera “UserID”).</param>
        /// <param name="windowName">Nombre de aplicación (cabecera “WindowName”).</param>
        Task<clReadUsuarios> CreateUsuarios(
            clCreateUsuarios objInput,
            int userId,
            string windowName);

        /// <summary>
        /// Actualiza campos selectivos de un Usuario.
        /// </summary>
        /// <param name="objInput">Datos para actualizar el Usuario, incluyendo su ID y campos a modificar.</param>
        /// <param name="userId">ID de usuario (cabecera “UserID”).</param>
        /// <param name="windowName">Nombre de aplicación (cabecera “WindowName”).</param>
        Task<clReadUsuarios?> UpdateUsuarios(
            clUpdateUsuarios objInput,
            int userId,
            string windowName);

        /// <summary>
        /// Elimina un Usuario por su ID.
        /// </summary>
        /// <param name="nUsuariosID">ID del Usuario a eliminar.</param>
        Task<bool> DeleteUsuarios(int nUsuariosID);
    }
}
