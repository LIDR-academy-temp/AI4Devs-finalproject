using FluentValidation;
using GraphApi.Infrastructure.Security;
using GraphApi.Models.TKT;
using GraphApi.Models.TKT.Graphql;
using GraphApi.Models.TKT.Tickets;
using GraphApi.Services.TKT;
using GraphApi.Services.TKT.Tickets;
using GraphApi.Infrastructure.Services;
using HotChocolate;
using HotChocolate.Authorization;
using System.Security.Claims;

namespace GraphApi.GraphQL.TKT.Tickets
{
    [MutationType]
    [GraphQLDescription("Punto de entrada para las mutaciones de Tickets: creación, actualización, cambio de estado y eliminación.")]
    public class TicketsMutation
    {
        [Authorize(Roles = new[] { "Residente" })]
        [GraphQLName("crearTicket")]
        [GraphQLDescription("Crea un ticket (residente autenticado por JWT).")]
        public async Task<CrearTicketPayload> CrearTicketAsync(
            CrearTicketInput input,
            [Service] ICuartaTicketService ticketService,
            [Service] IValidator<CrearTicketInput> validator,
            ClaimsPrincipal claimsPrincipal,
            CancellationToken cancellationToken)
        {
            var validation = await validator.ValidateAsync(input, cancellationToken);
            if (!validation.IsValid)
            {
                return new CrearTicketPayload
                {
                    Errors = validation.Errors.Select(e => new UserErrorGraph
                    {
                        Code = "VALIDATION_ERROR",
                        Message = e.ErrorMessage,
                        Field = e.PropertyName.ToLowerInvariant(),
                    }).ToList(),
                };
            }

            if (!JwtUserContext.TryGetUsuarioId(claimsPrincipal, out var usuarioId))
            {
                return CrearTicketPayload.FromServiceResult(null, "UNAUTHORIZED", "No autorizado");
            }

            var correo = JwtUserContext.GetCorreo(claimsPrincipal) ?? "residente";
            var perfil = JwtUserContext.GetPerfil(claimsPrincipal) ?? string.Empty;

            var (ticket, code, _, detail) = await ticketService.CrearTicketAsync(
                input, usuarioId, correo, perfil, cancellationToken);

            return CrearTicketPayload.FromServiceResult(ticket, code, detail);
        }

        [Authorize]
        [GraphQLName("createTickets")]
        [GraphQLDescription("Crea un nuevo Ticket usando los headers 'UserID' y 'WindowName'.")]
        public async Task<clReadTickets> CreateTicketsAsync(
            [GraphQLDescription("Datos necesarios para crear el Ticket.")]
            clCreateTickets objInput,
            [Service] ITicketsService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.CreateTickets(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("updateTickets")]
        [GraphQLDescription("Actualiza los campos especificados de un Ticket existente.")]
        public async Task<clReadTickets?> UpdateTicketsAsync(
            [GraphQLDescription("Datos del Ticket a actualizar.")]
            clUpdateTickets objInput,
            [Service] ITicketsService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.UpdateTickets(objInput, userId, windowName);
        }

        [Authorize]
        [GraphQLName("changeEstadoTicket")]
        [GraphQLDescription("Cambia el estado de un Ticket validando la transición permitida. Genera notificación automática al solicitante.")]
        public async Task<clReadTickets> ChangeEstadoTicketAsync(
            [GraphQLDescription("ID del Ticket.")]
            int ticketID,
            [GraphQLDescription("ID del nuevo estado destino.")]
            int nuevoEstadoTicketID,
            [Service] ITicketsService objService,
            [Service] IGraphQLContextService objCtx)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return await objService.ChangeEstadoTicket(ticketID, nuevoEstadoTicketID, userId, windowName);
        }

        [Authorize]
        [GraphQLName("deleteTickets")]
        [GraphQLDescription("Elimina un Ticket por su ID.")]
        public async Task<bool> delTicketsAsync(
            [GraphQLDescription("ID del Ticket a eliminar.")]
            int nTicketsID,
            [Service] ITicketsService objService)
        {
            return await objService.DeleteTickets(nTicketsID);
        }
    }
}
