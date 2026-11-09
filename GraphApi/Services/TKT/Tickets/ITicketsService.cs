using GraphApi.Models.TKT.Tickets;

namespace GraphApi.Services.TKT.Tickets
{
    /// <summary>
    /// Define las operaciones de negocio y persistencia para Tickets.
    /// </summary>
    public interface ITicketsService
    {
        /// <summary>
        /// Obtiene la lista de Tickets con filtros opcionales.
        /// </summary>
        /// <param name="userId">ID de usuario (cabecera “UserID”).</param>
        /// <param name="windowName">Nombre de aplicación (cabecera “WindowName”).</param>
        Task<IEnumerable<clReadTickets>> GetTickets(
            int userId,
            string windowName);

        /// <summary>
        /// Obtiene la lista dinámica de Tickets con filtros opcionales.
        /// </summary>
        /// <param name="ticketID">Filtro opcional para TicketID.</param>
        /// <param name="tituloTicket">Filtro opcional para TituloTicket.</param>
        /// <param name="descripcionTicket">Filtro opcional para DescripcionTicket.</param>
        /// <param name="usuarioSolicitanteID">Filtro opcional para UsuarioSolicitanteID.</param>
        /// <param name="nombreSolicitante">Filtro opcional para NombreSolicitante.</param>
        /// <param name="prioridadTicketID">Filtro opcional para PrioridadTicketID.</param>
        /// <param name="prioridadTicket">Filtro opcional para PrioridadTicket.</param>
        /// <param name="estadoTicketID">Filtro opcional para EstadoTicketID.</param>
        /// <param name="estadoTicket">Filtro opcional para EstadoTicket.</param>
        /// <param name="fechaCreacionTicket">Filtro opcional para FechaCreacionTicket.</param>
        /// <param name="fechaCierre">Filtro opcional para FechaCierre.</param>
        /// <param name="bEliminado">Filtro opcional para bEliminado.</param>
        /// <param name="columnNames">Nombres de columnas a retornar (separados por coma). Si es null o vacío, retorna columna por defecto.</param>
        /// <param name="userId">ID de usuario (cabecera “UserID”).</param>
        /// <param name="windowName">Nombre de aplicación (cabecera “WindowName”).</param>
        Task<IEnumerable<dynamic>> GetTicketsDynamic(
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
            string windowName);

        /// <summary>
        /// Crea un nuevo Ticket.
        /// </summary>
        /// <param name="objInput">Datos para crear el Ticket.</param>
        /// <param name="userId">ID de usuario (cabecera “UserID”).</param>
        /// <param name="windowName">Nombre de aplicación (cabecera “WindowName”).</param>
        Task<clReadTickets> CreateTickets(
            clCreateTickets objInput,
            int userId,
            string windowName);

        /// <summary>
        /// Actualiza campos selectivos de un Ticket.
        /// </summary>
        /// <param name="objInput">Datos para actualizar el Ticket, incluyendo su ID y campos a modificar.</param>
        /// <param name="userId">ID de usuario (cabecera “UserID”).</param>
        /// <param name="windowName">Nombre de aplicación (cabecera “WindowName”).</param>
        Task<clReadTickets?> UpdateTickets(
            clUpdateTickets objInput,
            int userId,
            string windowName);

        /// <summary>
        /// Elimina un Ticket por su ID.
        /// </summary>
        /// <param name="nTicketsID">ID del Ticket a eliminar.</param>
        Task<bool> DeleteTickets(int nTicketsID);

        /// <summary>
        /// Cambia el estado de un Ticket validando la transición permitida.
        /// Lanza InvalidOperationException si la transición no es válida.
        /// Genera notificación automática al usuario solicitante.
        /// </summary>
        /// <param name="ticketID">ID del Ticket a actualizar.</param>
        /// <param name="nuevoEstadoTicketID">ID del nuevo estado destino.</param>
        /// <param name="userId">ID del usuario que realiza el cambio.</param>
        /// <param name="windowName">Nombre de la ventana para auditoría.</param>
        Task<clReadTickets> ChangeEstadoTicket(int ticketID, int nuevoEstadoTicketID, int userId, string windowName);
    }
}
