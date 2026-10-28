using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.TKT.DocumentosTicket
{
    [SwaggerSchema("Modelo de lectura de un DocumentosTicket")]
    [GraphQLDescription("Objeto que representa un DocumentosTicket existente.")]
    public class clReadDocumentosTicket
    {
        [SwaggerSchema("Identificador único del DocumentosTicket")]
        [GraphQLDescription("Identificador único del DocumentosTicket")]
        public int? DocumentoTicketID { get; set; }
        [SwaggerSchema("TicketID")]
        [GraphQLDescription("TicketID")]
        public int? TicketID { get; set; }
        [SwaggerSchema("DocumentoID")]
        [GraphQLDescription("DocumentoID")]
        public int? DocumentoID { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }

        [SwaggerSchema("Creado")]
        [GraphQLDescription("Creado")]
        public string? Creado { get; set; }

        [SwaggerSchema("UsuarioCreacionID")]
        [GraphQLDescription("UsuarioCreacionID")]
        public int? UsuarioCreacionID { get; set; }

        [SwaggerSchema("FechaCreacion")]
        [GraphQLDescription("FechaCreacion")]
        public DateTime? FechaCreacion { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un DocumentosTicket")]
    [GraphQLDescription("Input para crear un DocumentosTicket.")]
    public class clCreateDocumentosTicket
    {
        [GraphQLNonNullType] [SwaggerSchema("TicketID")]
        [GraphQLDescription("TicketID")]
        public int TicketID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("DocumentoID")]
        [GraphQLDescription("DocumentoID")]
        public int DocumentoID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un DocumentosTicket")]
    [GraphQLDescription("Input para actualizar parcialmente un DocumentosTicket.")]
    public class clUpdateDocumentosTicket
    {
        [SwaggerSchema("Identificador único del DocumentosTicket")]
        [GraphQLDescription("Identificador único del DocumentosTicket")]
        public int? DocumentoTicketID { get; set; }
        [SwaggerSchema("TicketID")]
        [GraphQLDescription("TicketID")]
        public int? TicketID { get; set; }
        [SwaggerSchema("DocumentoID")]
        [GraphQLDescription("DocumentoID")]
        public int? DocumentoID { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
