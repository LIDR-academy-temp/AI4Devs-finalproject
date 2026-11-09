using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.TKT.Tickets
{
    [SwaggerSchema("Modelo de lectura de un Ticket")]
    [GraphQLDescription("Objeto que representa un Ticket existente.")]
    public class clReadTickets
    {
        [SwaggerSchema("Identificador único del Ticket")]
        [GraphQLDescription("Identificador único del Ticket")]
        public int? TicketID { get; set; }
        [SwaggerSchema("TituloTicket")]
        [GraphQLDescription("TituloTicket")]
        public string? TituloTicket { get; set; } = default!;
        [SwaggerSchema("DescripcionTicket")]
        [GraphQLDescription("DescripcionTicket")]
        public string? DescripcionTicket { get; set; }
        [SwaggerSchema("UsuarioSolicitanteID")]
        [GraphQLDescription("UsuarioSolicitanteID")]
        public int? UsuarioSolicitanteID { get; set; }
        [SwaggerSchema("NombreSolicitante")]
        [GraphQLDescription("NombreSolicitante")]
        public string? NombreSolicitante { get; set; } = default!;
        [SwaggerSchema("PrioridadTicketID")]
        [GraphQLDescription("PrioridadTicketID")]
        public int? PrioridadTicketID { get; set; }
        [SwaggerSchema("PrioridadTicket")]
        [GraphQLDescription("PrioridadTicket")]
        public string? PrioridadTicket { get; set; } = default!;
        [SwaggerSchema("EstadoTicketID")]
        [GraphQLDescription("EstadoTicketID")]
        public int? EstadoTicketID { get; set; }
        [SwaggerSchema("EstadoTicket")]
        [GraphQLDescription("EstadoTicket")]
        public string? EstadoTicket { get; set; } = default!;
        [SwaggerSchema("FechaCreacionTicket")]
        [GraphQLDescription("FechaCreacionTicket")]
        public DateTime? FechaCreacionTicket { get; set; }
        [SwaggerSchema("FechaCierre")]
        [GraphQLDescription("FechaCierre")]
        public DateTime? FechaCierre { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Ticket")]
    [GraphQLDescription("Input para crear un Ticket.")]
    public class clCreateTickets
    {
        [GraphQLNonNullType] [SwaggerSchema("TituloTicket")]
        [GraphQLDescription("TituloTicket")]
        public string TituloTicket { get; set; } = default!;
        [SwaggerSchema("DescripcionTicket")]
        [GraphQLDescription("DescripcionTicket")]
        public string? DescripcionTicket { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("UsuarioSolicitanteID")]
        [GraphQLDescription("UsuarioSolicitanteID")]
        public int UsuarioSolicitanteID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("PrioridadTicketID")]
        [GraphQLDescription("PrioridadTicketID")]
        public int PrioridadTicketID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("EstadoTicketID")]
        [GraphQLDescription("EstadoTicketID")]
        public int EstadoTicketID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("FechaCreacionTicket")]
        [GraphQLDescription("FechaCreacionTicket")]
        public DateTime FechaCreacionTicket { get; set; }
        [SwaggerSchema("FechaCierre")]
        [GraphQLDescription("FechaCierre")]
        public DateTime? FechaCierre { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Ticket")]
    [GraphQLDescription("Input para actualizar parcialmente un Ticket.")]
    public class clUpdateTickets
    {
        [SwaggerSchema("Identificador único del Ticket")]
        [GraphQLDescription("Identificador único del Ticket")]
        public int? TicketID { get; set; }
        [SwaggerSchema("TituloTicket")]
        [GraphQLDescription("TituloTicket")]
        public string? TituloTicket { get; set; }
        [SwaggerSchema("DescripcionTicket")]
        [GraphQLDescription("DescripcionTicket")]
        public string? DescripcionTicket { get; set; }
        [SwaggerSchema("UsuarioSolicitanteID")]
        [GraphQLDescription("UsuarioSolicitanteID")]
        public int? UsuarioSolicitanteID { get; set; }
        [SwaggerSchema("PrioridadTicketID")]
        [GraphQLDescription("PrioridadTicketID")]
        public int? PrioridadTicketID { get; set; }
        [SwaggerSchema("EstadoTicketID")]
        [GraphQLDescription("EstadoTicketID")]
        public int? EstadoTicketID { get; set; }
        [SwaggerSchema("FechaCreacionTicket")]
        [GraphQLDescription("FechaCreacionTicket")]
        public DateTime? FechaCreacionTicket { get; set; }
        [SwaggerSchema("FechaCierre")]
        [GraphQLDescription("FechaCierre")]
        public DateTime? FechaCierre { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
