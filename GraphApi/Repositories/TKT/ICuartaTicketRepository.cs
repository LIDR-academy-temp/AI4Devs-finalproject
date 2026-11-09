using System.Data;
using GraphApi.Models.TKT.Tickets;

namespace GraphApi.Repositories.TKT;

public interface ICuartaTicketRepository
{
    Task<int> InsertarAsync(
        CrearTicketInsertArgs args,
        IDbTransaction tx);

    Task<clReadTickets?> ObtenerVistaAsync(int ticketId);
}

public sealed class CrearTicketInsertArgs
{
    public string Titulo { get; set; } = string.Empty;
    public string Descripcion { get; set; } = string.Empty;
    public int UsuarioSolicitanteId { get; set; }
    public int PrioridadTicketId { get; set; }
    public int EstadoTicketId { get; set; }
    public int? CategoriaTicketId { get; set; }
    public int? CanalId { get; set; }
    public string CreadoCorreo { get; set; } = string.Empty;
}
