using System.Data;
using Dapper;
using GraphApi.Models.TKT.Tickets;

namespace GraphApi.Repositories.TKT;

public sealed class CuartaTicketRepository : ICuartaTicketRepository
{
    private readonly IDbConnection _db;
    private readonly bool _hasExtendedColumns;

    public CuartaTicketRepository(IDbConnection db)
    {
        _db = db;
        _hasExtendedColumns = ColumnExists("tkt", "Tickets", "CategoriaTicketID");
    }

    public async Task<int> InsertarAsync(CrearTicketInsertArgs args, IDbTransaction tx)
    {
        if (_hasExtendedColumns)
        {
            const string sqlExt = """
                INSERT INTO tkt.Tickets
                    (TituloTicket, DescripcionTicket, UsuarioSolicitanteID, PrioridadTicketID, EstadoTicketID,
                     CategoriaTicketID, CanalID, FechaCreacionTicket, bEliminado, Creado, UsuarioCreacionID, FechaCreacion)
                VALUES
                    (@Titulo, @Descripcion, @UsuarioSolicitanteID, @PrioridadTicketID, @EstadoTicketID,
                     @CategoriaTicketID, @CanalID, SYSUTCDATETIME(), 0, @Creado, @UsuarioSolicitanteID, SYSUTCDATETIME());
                SELECT CAST(SCOPE_IDENTITY() AS INT);
                """;

            return await _db.ExecuteScalarAsync<int>(sqlExt, new
            {
                Titulo = args.Titulo,
                Descripcion = args.Descripcion,
                UsuarioSolicitanteID = args.UsuarioSolicitanteId,
                PrioridadTicketID = args.PrioridadTicketId,
                EstadoTicketID = args.EstadoTicketId,
                CategoriaTicketID = args.CategoriaTicketId,
                CanalID = args.CanalId,
                Creado = args.CreadoCorreo,
            }, tx);
        }

        const string sql = """
            INSERT INTO tkt.Tickets
                (Titulo, Descripcion, UsuarioSolicitanteID, PrioridadTicketID, EstadoTicketID,
                 FechaCreacionTicket, bEliminado, Creado, UsuarioCreacionID, FechaCreacion)
            VALUES
                (@Titulo, @Descripcion, @UsuarioSolicitanteID, @PrioridadTicketID, @EstadoTicketID,
                 SYSUTCDATETIME(), 0, @Creado, @UsuarioSolicitanteID, SYSUTCDATETIME());
            SELECT CAST(SCOPE_IDENTITY() AS INT);
            """;

        return await _db.ExecuteScalarAsync<int>(sql, new
        {
            Titulo = args.Titulo,
            Descripcion = args.Descripcion,
            UsuarioSolicitanteID = args.UsuarioSolicitanteId,
            PrioridadTicketID = args.PrioridadTicketId,
            EstadoTicketID = args.EstadoTicketId,
            Creado = args.CreadoCorreo,
        }, tx);
    }

    public async Task<clReadTickets?> ObtenerVistaAsync(int ticketId)
    {
        const string sql = """
            SELECT TicketID, TituloTicket, DescripcionTicket, UsuarioSolicitanteID, NombreSolicitante,
                   PrioridadTicketID, PrioridadTicket, EstadoTicketID, EstadoTicket,
                   FechaCreacionTicket, FechaCierre, bEliminado
            FROM tkt.vsTickets WITH (NOLOCK)
            WHERE TicketID = @TicketID;
            """;

        return await _db.QuerySingleOrDefaultAsync<clReadTickets>(sql, new { TicketID = ticketId });
    }

    private bool ColumnExists(string schema, string table, string column)
    {
        const string sql = """
            SELECT 1
            FROM INFORMATION_SCHEMA.COLUMNS
            WHERE TABLE_SCHEMA = @Schema AND TABLE_NAME = @Table AND COLUMN_NAME = @Column;
            """;

        return _db.QuerySingleOrDefault<int?>(sql, new { Schema = schema, Table = table, Column = column }) == 1;
    }
}
