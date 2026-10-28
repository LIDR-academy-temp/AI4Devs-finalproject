using System.Text.Json.Serialization;
using Microsoft.AspNetCore.Http;
using Web.Models.Admin;
using Web.Models.Residente;

namespace Web.Services
{
  public sealed class GraphApiBackendService : IGraphApiBackendService
    {
        private readonly IHttpContextAccessor _httpContextAccessor;

        public GraphApiBackendService(IHttpContextAccessor httpContextAccessor)
        {
            _httpContextAccessor = httpContextAccessor;
        }
        public async Task<(string Token, DateTime Expires)> AuthenticateAsync(string username, string password)
        {
            return await GraphQLService.AuthenticateAsync(username, password, windowName: "web");
        }

        public async Task<IReadOnlyList<CondominioFormViewModel>> GetCondominiosAsync()
        {
            const string query = """
            query ($first: Int!) {
              getCondominios(first: $first) {
                edges {
                  node {
                    condominioID
                    nombreCondominio
                    direccionCondominio
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<CondominiosQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetCondominios);
        }

        public async Task<IReadOnlyList<UsuarioLookupViewModel>> GetUsuariosAsync()
        {
            const string query = """
            query ($first: Int!) {
              getUsuarios(first: $first) {
                edges {
                  node {
                    usuarioID
                    nombreUsuario
                    correoUsuario
                    bActivoUsuario
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<UsuariosQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetUsuarios)
                .Where(item => item.UsuarioID.HasValue && item.bEliminado != true && item.bActivoUsuario != false)
                .OrderBy(item => item.NombreUsuario)
                .ToList();
        }

        public async Task<IReadOnlyList<TipoIdentificacionLookupViewModel>> GetTipoIdentificacionesAsync()
        {
            const string query = """
            query ($first: Int!) {
              getTipoIdentificacions(first: $first) {
                edges {
                  node {
                    tipoIdentificacionID
                    tipoIdentificacion
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<TipoIdentificacionesQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetTipoIdentificacions)
                .Where(item => item.TipoIdentificacionID.HasValue && item.bEliminado != true)
                .OrderBy(item => item.TipoIdentificacion)
                .ToList();
        }

        public async Task<IReadOnlyList<TicketBoardItemViewModel>> GetTicketsAsync()
        {
            const string query = """
            query ($first: Int!) {
              getTickets(first: $first) {
                edges {
                  node {
                    ticketID
                    tituloTicket
                    descripcionTicket
                    usuarioSolicitanteID
                    nombreSolicitante
                    prioridadTicketID
                    prioridadTicket
                    estadoTicketID
                    estadoTicket
                    fechaCreacionTicket
                    fechaCierre
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<TicketsQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetTickets)
                .Where(item => item.TicketID.HasValue && item.bEliminado != true)
                .OrderByDescending(item => item.FechaCreacionTicket)
                .ThenByDescending(item => item.TicketID ?? 0)
                .ToList();
        }

        public async Task<IReadOnlyList<TicketBoardStateLookupViewModel>> GetEstadosTicketsAsync()
        {
            const string query = """
            query ($first: Int!) {
              getEstadosTickets(first: $first) {
                edges {
                  node {
                    estadoTicketID
                    estadoTicket
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<EstadosTicketsQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetEstadosTickets)
                .Where(item => item.EstadoTicketID > 0 && item.bEliminado != true)
                .OrderBy(item => item.EstadoTicket)
                .ToList();
        }

        public async Task<IReadOnlyList<TicketBoardPriorityLookupViewModel>> GetPrioridadTicketsAsync()
        {
            const string query = """
            query ($first: Int!) {
              getPrioridadEstickets(first: $first) {
                edges {
                  node {
                    prioridadTicketID
                    prioridadTicket
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<PrioridadTicketsQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetPrioridadEstickets)
                .Where(item => item.PrioridadTicketID > 0 && item.bEliminado != true)
                .OrderBy(item => item.PrioridadTicket)
                .ToList();
        }

        public async Task<IReadOnlyList<TicketBoardCommentViewModel>> GetComentariosTicketsAsync()
        {
            const string query = """
            query ($first: Int!) {
              getComentariosTickets(first: $first) {
                edges {
                  node {
                    comentarioTicketID
                    ticketID
                    usuarioID
                    comentario
                    fechaComentario
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<ComentariosTicketsQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetComentariosTickets)
                .Where(item => item.ComentarioTicketID.HasValue && item.bEliminado != true)
                .OrderByDescending(item => item.FechaComentario)
                .ThenByDescending(item => item.ComentarioTicketID ?? 0)
                .ToList();
        }

        public async Task<IReadOnlyList<TicketBoardAssignmentViewModel>> GetTicketsUsuariosAsignadosAsync()
        {
            const string query = """
            query ($first: Int!) {
              getTicketsUsuariosAsignados(first: $first) {
                edges {
                  node {
                    ticketsUsuariosAsignadosID
                    ticketID
                    tituloTicket
                    usuarioID
                    usuarioAsignado
                    terminado
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<TicketsUsuariosAsignadosQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetTicketsUsuariosAsignados)
                .Where(item => item.TicketsUsuariosAsignadosID.HasValue && item.bEliminado != true)
                .OrderByDescending(item => item.TicketsUsuariosAsignadosID ?? 0)
                .ToList();
        }

        public async Task<IReadOnlyList<TicketBoardAttachmentViewModel>> GetTicketAttachmentsAsync()
        {
            const string documentosQuery = """
            query ($first: Int!) {
              getDocumentosTickets(first: $first, where: { bEliminado: { eq: false } }) {
                edges {
                  node {
                    documentoTicketID
                    ticketID
                    documentoID
                    bEliminado
                  }
                }
              }
            }
            """;

            const string archivosQuery = """
            query ($first: Int!) {
              getArchivos(first: $first, where: { bEliminado: { eq: false } }) {
                edges {
                  node {
                    archivoID
                    nombre
                    ruta
                    tipoArchivo
                    tipoArchivoID
                    esPrivado
                    bEliminado
                  }
                }
              }
            }
            """;

            var documentosResponse = await GraphQLService.QueryAsync<DocumentosTicketsQueryEnvelope>(documentosQuery, new { first = 50 });
            var archivosResponse = await GraphQLService.QueryAsync<ArchivosQueryEnvelope>(archivosQuery, new { first = 50 });

            var documentos = ExtractNodes(documentosResponse.GetDocumentosTickets)
                .Where(item => item.DocumentoTicketID.HasValue && item.TicketID.HasValue && item.DocumentoID.HasValue && item.bEliminado != true)
                .OrderByDescending(item => item.DocumentoTicketID ?? 0)
                .ToList();

            var archivos = ExtractNodes(archivosResponse.GetArchivos)
                .Where(item => item.ArchivoID.HasValue && item.bEliminado != true)
                .ToDictionary(item => item.ArchivoID!.Value, item => item);

            var attachments = new List<TicketBoardAttachmentViewModel>();

            foreach (var documento in documentos)
            {
                if (!archivos.TryGetValue(documento.DocumentoID!.Value, out var archivo))
                {
                    continue;
                }

                attachments.Add(new TicketBoardAttachmentViewModel
                {
                    DocumentoTicketID = documento.DocumentoTicketID!.Value,
                    TicketID = documento.TicketID!.Value,
                    DocumentoID = documento.DocumentoID!.Value,
                    NombreArchivo = string.IsNullOrWhiteSpace(archivo.Nombre)
                        ? Path.GetFileName(archivo.Ruta ?? string.Empty)
                        : archivo.Nombre,
                    RutaArchivo = archivo.Ruta,
                    TipoArchivo = archivo.TipoArchivo,
                    EsPrivado = archivo.EsPrivado ?? false
                });
            }

            return attachments
                .OrderByDescending(item => item.DocumentoTicketID)
                .ToList();
        }

        public async Task<int?> SaveTicketAsync(TicketBoardItemViewModel model)
        {
            var fechaCreacion = EnsureUtcKind(model.FechaCreacionTicket == default ? DateTime.UtcNow : model.FechaCreacionTicket);
            DateTime? fechaCierre = model.FechaCierre.HasValue
                ? EnsureUtcKind(model.FechaCierre.Value)
                : null;

            if (model.TicketID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateTicketsInput!) {
                  createTickets(objInput: $objInput) {
                    ticketID
                  }
                }
                """;

                var created = await GraphQLService.MutationAsync<TicketIdMutationEnvelope>(mutation, new
                {
                    objInput = new
                    {
                        tituloTicket = model.TituloTicket,
                        descripcionTicket = model.DescripcionTicket,
                        usuarioSolicitanteID = model.UsuarioSolicitanteID,
                        prioridadTicketID = model.PrioridadTicketID,
                        estadoTicketID = model.EstadoTicketID,
                        fechaCreacionTicket = fechaCreacion,
                        fechaCierre,
                        bEliminado = model.bEliminado
                    }
                });

                  return created.CreateTickets?.TicketID;
            }

            const string updateMutation = """
            mutation ($objInput: clUpdateTicketsInput!) {
              updateTickets(objInput: $objInput) {
                ticketID
              }
            }
            """;

            var updated = await GraphQLService.MutationAsync<TicketIdMutationEnvelope>(updateMutation, new
            {
                objInput = new
                {
                    ticketID = model.TicketID,
                    tituloTicket = model.TituloTicket,
                    descripcionTicket = model.DescripcionTicket,
                    usuarioSolicitanteID = model.UsuarioSolicitanteID,
                    prioridadTicketID = model.PrioridadTicketID,
                    estadoTicketID = model.EstadoTicketID,
                    fechaCreacionTicket = fechaCreacion,
                    fechaCierre,
                    bEliminado = model.bEliminado
                }
            });

                return updated.UpdateTickets?.TicketID ?? model.TicketID;
        }

        public async Task<bool> DeleteTicketAsync(int ticketId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteTickets(nTicketsID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = ticketId });
            return true;
        }

        public async Task<bool> SaveTicketCommentAsync(TicketBoardReplyViewModel model)
        {
            var fechaComentario = EnsureUtcKind(DateTime.UtcNow);

            const string mutation = """
            mutation ($objInput: clCreateComentariosTicketInput!) {
              createComentariosTicket(objInput: $objInput) {
                comentarioTicketID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new
            {
                objInput = new
                {
                    ticketID = model.TicketID,
                    usuarioID = model.UsuarioID,
                    comentario = model.Comentario,
                    fechaComentario,
                    bEliminado = model.bEliminado
                }
            });

            return true;
        }

        public async Task<bool> SaveTicketAssignmentAsync(TicketBoardAssignmentFormViewModel model)
        {
            if (model.TicketsUsuariosAsignadosID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateTicketsUsuariosAsignadosInput!) {
                  createTicketsUsuariosAsignados(objInput: $objInput) {
                    ticketsUsuariosAsignadosID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        ticketID = model.TicketID,
                        usuarioID = model.UsuarioID,
                        terminado = model.Terminado,
                        bEliminado = model.bEliminado
                    }
                });

                return true;
            }

            const string updateMutation = """
            mutation ($objInput: clUpdateTicketsUsuariosAsignadosInput!) {
              updateTicketsUsuariosAsignados(objInput: $objInput) {
                ticketsUsuariosAsignadosID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(updateMutation, new
            {
                objInput = new
                {
                    ticketsUsuariosAsignadosID = model.TicketsUsuariosAsignadosID,
                    ticketID = model.TicketID,
                    usuarioID = model.UsuarioID,
                    terminado = model.Terminado,
                    bEliminado = model.bEliminado
                }
            });

            return true;
        }

        public async Task<int?> SaveArchivoAsync(string nombre, string ruta, int? tipoArchivoID, bool esPrivado, bool bEliminado)
        {
            const string mutation = """
            mutation ($objInput: clCreateArchivosInput!) {
              createArchivos(objInput: $objInput) {
                archivoID
              }
            }
            """;

            var created = await GraphQLService.MutationAsync<ArchivoIdMutationEnvelope>(mutation, new
            {
                objInput = new
                {
                    nombre,
                    ruta,
                    tipoArchivoID,
                    esPrivado,
                    bEliminado
                }
            });

            return created.CreateArchivos?.ArchivoID;
        }

        public async Task<int?> SaveTicketDocumentoAsync(int ticketId, int documentoId, bool bEliminado)
        {
            const string mutation = """
            mutation ($objInput: clCreateDocumentosTicketInput!) {
              createDocumentosTicket(objInput: $objInput) {
                documentoTicketID
              }
            }
            """;

            var created = await GraphQLService.MutationAsync<TicketDocumentIdMutationEnvelope>(mutation, new
            {
                objInput = new
                {
                    ticketID = ticketId,
                    documentoID = documentoId,
                    bEliminado
                }
            });

            return created.CreateDocumentosTicket?.DocumentoTicketID;
        }

        public async Task<bool> DeleteArchivoAsync(int archivoId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteArchivos(nArchivosID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = archivoId });
            return true;
        }

        public async Task<bool> SaveCondominioAsync(CondominioFormViewModel model)
        {
            if (model.CondominioID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateCondominiosInput!) {
                  createCondominios(objInput: $objInput) {
                    condominioID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        nombreCondominio = model.NombreCondominio,
                        direccionCondominio = model.DireccionCondominio,
                        bEliminado = model.bEliminado
                    }
                });

                return true;
            }

            const string updateMutation = """
            mutation ($objInput: clUpdateCondominiosInput!) {
              updateCondominios(objInput: $objInput) {
                condominioID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(updateMutation, new
            {
                objInput = new
                {
                    condominioID = model.CondominioID,
                    nombreCondominio = model.NombreCondominio,
                    direccionCondominio = model.DireccionCondominio,
                    bEliminado = model.bEliminado
                }
            });

            return true;
        }

        public async Task<bool> DeleteCondominioAsync(int condominioId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteCondominios(nCondominiosID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = condominioId });
            return true;
        }

        public async Task<IReadOnlyList<CasaFormViewModel>> GetCasasAsync()
        {
            const string query = """
            query ($first: Int!) {
              getCasas(first: $first) {
                edges {
                  node {
                    casaID
                    condominioID
                    nombreCondominio
                    direccionCondominio
                    direccionCasa
                    numeroExtCasa
                    propietarioUsuarioID
                    nombrePropietario
                    correoPropietario
                    telefonoPropietario
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<CasasQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetCasas);
        }

        public async Task<bool> SaveCasaAsync(CasaFormViewModel model)
        {
            if (model.CasaID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateCasasInput!) {
                  createCasas(objInput: $objInput) {
                    casaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        condominioID = model.CondominioID,
                        direccionCasa = model.DireccionCasa,
                        numeroExtCasa = model.NumeroExtCasa,
                        propietarioUsuarioID = model.PropietarioUsuarioID,
                        bEliminado = model.bEliminado
                    }
                });

                return true;
            }

            const string updateMutation = """
            mutation ($objInput: clUpdateCasasInput!) {
              updateCasas(objInput: $objInput) {
                casaID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(updateMutation, new
            {
                objInput = new
                {
                    casaID = model.CasaID,
                    condominioID = model.CondominioID,
                    direccionCasa = model.DireccionCasa,
                    numeroExtCasa = model.NumeroExtCasa,
                    propietarioUsuarioID = model.PropietarioUsuarioID,
                    bEliminado = model.bEliminado
                }
            });

            return true;
        }

        public async Task<bool> DeleteCasaAsync(int casaId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteCasas(nCasasID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = casaId });
            return true;
        }

        public async Task<IReadOnlyList<VisitaFormViewModel>> GetVisitasAsync()
        {
            const string query = """
            query ($first: Int!) {
              getVisitas(first: $first) {
                edges {
                  node {
                    visitaID
                    visitanteNombre
                    usuarioVisitadoID
                    casaID
                    tipoIdentificacionID
                    numeroIdentificacion
                    rutaDocumento
                    fechaEntrada
                    fechaSalida
                    autorizado
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<VisitasQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetVisitas);
        }

        public async Task<bool> SaveVisitaAsync(VisitaFormViewModel model)
        {
            if (model.VisitaID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateVisitasInput!) {
                  createVisitas(objInput: $objInput) {
                    visitaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        visitanteNombre = model.VisitanteNombre,
                        usuarioVisitadoID = model.UsuarioVisitadoID,
                        casaID = model.CasaID,
                        tipoIdentificacionID = model.TipoIdentificacionID,
                        numeroIdentificacion = model.NumeroIdentificacion,
                        rutaDocumento = model.RutaDocumento,
                        fechaEntrada = model.FechaEntrada,
                        fechaSalida = model.FechaSalida,
                        autorizado = model.Autorizado,
                        bEliminado = model.bEliminado
                    }
                });

                return true;
            }

            const string updateMutation = """
            mutation ($objInput: clUpdateVisitasInput!) {
              updateVisitas(objInput: $objInput) {
                visitaID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(updateMutation, new
            {
                objInput = new
                {
                    visitaID = model.VisitaID,
                    visitanteNombre = model.VisitanteNombre,
                    usuarioVisitadoID = model.UsuarioVisitadoID,
                    casaID = model.CasaID,
                    tipoIdentificacionID = model.TipoIdentificacionID,
                    numeroIdentificacion = model.NumeroIdentificacion,
                    rutaDocumento = model.RutaDocumento,
                    fechaEntrada = model.FechaEntrada,
                    fechaSalida = model.FechaSalida,
                    autorizado = model.Autorizado,
                    bEliminado = model.bEliminado
                }
            });

            return true;
        }

        public async Task<bool> DeleteVisitaAsync(int visitaId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteVisitas(nVisitasID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = visitaId });
            return true;
        }

        public async Task<IReadOnlyList<PaseQrFormViewModel>> GetPasesQrAsync()
        {
            const string query = """
            query ($first: Int!) {
              getVisitasGeneradas(first: $first) {
                edges {
                  node {
                    visitaGeneradaID
                    nombreVisitante
                    usuarioVisitadoID
                    nombreVisitado
                    correoVisitado
                    casaID
                    direccionCasa
                    numeroExtCasa
                    tipoIdentificacionID
                    tipoIdentificacion
                    numeroIdentificacion
                    rutaDocumento
                    codigoQR
                    fechaEmision
                    fechaExpira
                    bUsado
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<PasesQrQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetVisitasGeneradas)
                .OrderByDescending(item => item.FechaEmision ?? DateTime.MinValue)
                .ThenByDescending(item => item.VisitaGeneradaID ?? 0)
                .ToList();
        }

        public async Task<PaseQrFormViewModel?> GetPaseQrByCodeAsync(string codigoQr)
        {
          if (string.IsNullOrWhiteSpace(codigoQr))
            {
                return null;
            }

          codigoQr = codigoQr.Trim();

            var pases = await GetPasesQrAsync();
            return pases.FirstOrDefault(item =>
                string.Equals(item.CodigoQR, codigoQr, StringComparison.OrdinalIgnoreCase));
        }

        public async Task<bool> SavePaseQrAsync(PaseQrFormViewModel model)
        {
            var fechaEmision = model.FechaEmision ?? DateTime.Now;
            var fechaExpira = model.FechaExpira ?? fechaEmision.AddHours(4);

            if (model.VisitaGeneradaID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateVisitasGeneradasInput!) {
                  createVisitasGeneradas(objInput: $objInput) {
                    visitaGeneradaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        nombreVisitante = model.NombreVisitante,
                        usuarioVisitadoID = model.UsuarioVisitadoID,
                        casaID = model.CasaID,
                        tipoIdentificacionID = model.TipoIdentificacionID,
                        numeroIdentificacion = model.NumeroIdentificacion,
                        rutaDocumento = model.RutaDocumento,
                        codigoQR = model.CodigoQR,
                        fechaEmision,
                        fechaExpira,
                        bUsado = model.bUsado,
                        bEliminado = model.bEliminado
                    }
                });

                return true;
            }

            const string updateMutation = """
            mutation ($objInput: clUpdateVisitasGeneradasInput!) {
              updateVisitasGeneradas(objInput: $objInput) {
                visitaGeneradaID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(updateMutation, new
            {
                objInput = new
                {
                    visitaGeneradaID = model.VisitaGeneradaID,
                    nombreVisitante = model.NombreVisitante,
                    usuarioVisitadoID = model.UsuarioVisitadoID,
                    casaID = model.CasaID,
                    tipoIdentificacionID = model.TipoIdentificacionID,
                    numeroIdentificacion = model.NumeroIdentificacion,
                    rutaDocumento = model.RutaDocumento,
                    codigoQR = model.CodigoQR,
                    fechaEmision,
                    fechaExpira,
                    bUsado = model.bUsado,
                    bEliminado = model.bEliminado
                }
            });

            return true;
        }

        public async Task<bool> DeletePaseQrAsync(int paseQrId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteVisitasGeneradas(nVisitasGeneradasID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = paseQrId });
            return true;
        }

        public async Task<IReadOnlyList<ReservaAmenidadFormViewModel>> GetReservasAmenidadesAsync()
        {
            const string query = """
            query ($first: Int!) {
              getReservacionesAreas(first: $first) {
                edges {
                  node {
                    reservacionAreaID
                    areasComunesID
                    areasComunes
                    capacidad
                    requiereReservacion
                    usuarioID
                    nombreUsuario
                    correoUsuario
                    fechaInicio
                    fechaFin
                    reservacionEstadoID
                    reservacionEstado
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<ReservasAmenidadesQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetReservacionesAreas)
                .Where(item => item.ReservacionAreaID > 0 && item.bEliminado != true)
                .OrderByDescending(item => item.FechaInicio)
                .ToList();
        }

        public async Task<IReadOnlyList<ReservacionEstadoLookupViewModel>> GetReservacionEstadosAsync()
        {
            const string query = """
            query ($first: Int!) {
              getReservacionesEstados(first: $first) {
                edges {
                  node {
                    reservacionEstadoID
                    reservacionEstado
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<ReservacionEstadosQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetReservacionesEstados)
              .Where(item => item.ReservacionEstadoID > 0 && item.bEliminado != true)
                .OrderBy(item => item.ReservacionEstado)
                .ToList();
        }

        public async Task<bool> SaveReservaAmenidadAsync(ReservaAmenidadFormViewModel model)
        {
          var fechaInicio = DateTime.SpecifyKind(model.FechaInicio, DateTimeKind.Utc);
          var fechaFin = DateTime.SpecifyKind(model.FechaFin, DateTimeKind.Utc);

            if (model.ReservacionAreaID <= 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateReservacionesAreaInput!) {
                  createReservacionesArea(objInput: $objInput) {
                    reservacionAreaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        areasComunesID = model.AreasComunesID,
                        usuarioID = model.UsuarioID,
                    fechaInicio,
                    fechaFin,
                        reservacionEstadoID = model.ReservacionEstadoID,
                        bEliminado = model.bEliminado ?? false
                    }
                });

                return true;
            }

            const string updateMutation = """
            mutation ($objInput: clUpdateReservacionesAreaInput!) {
              updateReservacionesArea(objInput: $objInput) {
                reservacionAreaID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(updateMutation, new
            {
                objInput = new
                {
                    reservacionAreaID = model.ReservacionAreaID,
                    areasComunesID = model.AreasComunesID,
                    usuarioID = model.UsuarioID,
                fechaInicio,
                fechaFin,
                    reservacionEstadoID = model.ReservacionEstadoID,
                    bEliminado = model.bEliminado ?? false
                }
            });

            return true;
        }

        public async Task<bool> DeleteReservaAmenidadAsync(int reservacionAreaId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteReservacionesArea(nReservacionesAreaID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = reservacionAreaId });
            return true;
        }

        public async Task<IReadOnlyList<AreaComunFormViewModel>> GetAreasComunesAsync()
        {
            const string query = """
            query ($first: Int!) {
              getAreasComunes(first: $first) {
                edges {
                  node {
                    areasComunesID
                    areasComunes
                    descripcionAreasComunes
                    capacidad
                    requiereReservacion
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<AreasComunesQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetAreasComunes);
        }

        public async Task<bool> SaveAreaComunAsync(AreaComunFormViewModel model)
        {
            if (model.AreasComunesID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateAreasComunesInput!) {
                  createAreasComunes(objInput: $objInput) {
                    areasComunesID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        areasComunes = model.AreasComunes,
                        descripcionAreasComunes = model.DescripcionAreasComunes,
                        capacidad = model.Capacidad,
                        requiereReservacion = model.RequiereReservacion,
                        bEliminado = model.bEliminado
                    }
                });

                return true;
            }

            const string updateMutation = """
            mutation ($objInput: clUpdateAreasComunesInput!) {
              updateAreasComunes(objInput: $objInput) {
                areasComunesID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(updateMutation, new
            {
                objInput = new
                {
                    areasComunesID = model.AreasComunesID,
                    areasComunes = model.AreasComunes,
                    descripcionAreasComunes = model.DescripcionAreasComunes,
                    capacidad = model.Capacidad,
                    requiereReservacion = model.RequiereReservacion,
                    bEliminado = model.bEliminado
                }
            });

            return true;
        }

        public async Task<bool> DeleteAreaComunAsync(int areaComunId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteAreasComunes(nAreasComunesID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = areaComunId });
            return true;
        }

        // ──────────────────────────────────────────────────────────
        // Finanzas — Cuentas
        // ──────────────────────────────────────────────────────────
        public async Task<IReadOnlyList<CuentaFormViewModel>> GetCuentasAsync()
        {
            const string query = """
            query ($first: Int!) {
              getCuentas(first: $first) {
                edges {
                  node {
                    cuentaID
                    cuenta
                    tipo
                    saldo
                    responsableUsuarioID
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<CuentasQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetCuentas);
        }

        public async Task<bool> SaveCuentaAsync(CuentaFormViewModel model)
        {
            if (model.CuentaID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateCuentasInput!) {
                  createCuentas(objInput: $objInput) {
                    cuentaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        cuenta = model.Cuenta,
                        tipo = model.Tipo,
                        saldo = model.Saldo,
                        responsableUsuarioID = model.ResponsableUsuarioID,
                        bEliminado = model.bEliminado
                    }
                });

                return true;
            }

            const string updateMutation = """
            mutation ($objInput: clUpdateCuentasInput!) {
              updateCuentas(objInput: $objInput) {
                cuentaID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(updateMutation, new
            {
                objInput = new
                {
                    cuentaID = model.CuentaID,
                    cuenta = model.Cuenta,
                    tipo = model.Tipo,
                    saldo = model.Saldo,
                    responsableUsuarioID = model.ResponsableUsuarioID,
                    bEliminado = model.bEliminado
                }
            });

            return true;
        }

        public async Task<bool> DeleteCuentaAsync(int cuentaId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteCuentas(nCuentasID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = cuentaId });
            return true;
        }

        // ──────────────────────────────────────────────────────────
        // Finanzas — TiposMovimiento
        // ──────────────────────────────────────────────────────────
        public async Task<IReadOnlyList<TipoMovimientoLookupViewModel>> GetTiposMovimientoAsync()
        {
            const string query = """
            query ($first: Int!) {
              getTiposMovimientos(first: $first) {
                edges {
                  node {
                    tipoMovimientoID
                    tipoMovimiento
                    bCargo
                    bAbono
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<TiposMovimientoQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetTiposMovimientos)
                .Where(item => item.bEliminado != true)
                .OrderBy(item => item.TipoMovimiento)
                .ToList();
        }

        // ──────────────────────────────────────────────────────────
        // Finanzas — Cuotas
        // ──────────────────────────────────────────────────────────
        public async Task<IReadOnlyList<CuotaFormViewModel>> GetCuotasAsync()
        {
            const string query = """
            query ($first: Int!) {
              getCuotas(first: $first) {
                edges {
                  node {
                    cuotaID
                    usuarioID
                    casaID
                    monto
                    periodoInicio
                    periodoFin
                    fechaVencimiento
                    pagado
                    fechaPago
                    metodoPago
                    referenciaPago
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<CuotasQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetCuotas);
        }

        public async Task<bool> SaveCuotaAsync(CuotaFormViewModel model)
        {
            if (model.CuotaID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateCuotasInput!) {
                  createCuotas(objInput: $objInput) {
                    cuotaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        usuarioID = model.UsuarioID,
                        casaID = model.CasaID,
                        monto = model.Monto,
                        periodoInicio = EnsureUtcKind(model.PeriodoInicio),
                        periodoFin = EnsureUtcKind(model.PeriodoFin),
                        fechaVencimiento = EnsureUtcKind(model.FechaVencimiento),
                        pagado = model.Pagado,
                        fechaPago = model.FechaPago.HasValue ? EnsureUtcKind(model.FechaPago.Value) : (DateTime?)null,
                        metodoPago = model.MetodoPago,
                        referenciaPago = model.ReferenciaPago,
                        bEliminado = model.bEliminado
                    }
                });

                return true;
            }

            const string updateMutation = """
            mutation ($objInput: clUpdateCuotasInput!) {
              updateCuotas(objInput: $objInput) {
                cuotaID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(updateMutation, new
            {
                objInput = new
                {
                    cuotaID = model.CuotaID,
                    usuarioID = model.UsuarioID,
                    casaID = model.CasaID,
                    monto = model.Monto,
                    periodoInicio = EnsureUtcKind(model.PeriodoInicio),
                    periodoFin = EnsureUtcKind(model.PeriodoFin),
                    fechaVencimiento = EnsureUtcKind(model.FechaVencimiento),
                    pagado = model.Pagado,
                    fechaPago = model.FechaPago.HasValue ? EnsureUtcKind(model.FechaPago.Value) : (DateTime?)null,
                    metodoPago = model.MetodoPago,
                    referenciaPago = model.ReferenciaPago,
                    bEliminado = model.bEliminado
                }
            });

            return true;
        }

        public async Task<bool> DeleteCuotaAsync(int cuotaId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteCuotas(nCuotasID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = cuotaId });
            return true;
        }

        // ──────────────────────────────────────────────────────────
        // Finanzas — Transacciones
        // ──────────────────────────────────────────────────────────
        public async Task<IReadOnlyList<TransaccionFormViewModel>> GetTransaccionesAsync()
        {
            const string query = """
            query ($first: Int!) {
              getTransacciones(first: $first) {
                edges {
                  node {
                    transaccionID
                    cuentaID
                    cuenta
                    tipoCuenta
                    usuarioID
                    nombreUsuario
                    tipoMovimientoID
                    tipoMovimiento
                    cargo
                    abono
                    motivo
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<TransaccionesQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetTransacciones)
                .Select(item => new TransaccionFormViewModel
                {
                    TransaccionID = item.TransaccionID,
                    CuentaID = item.CuentaID ?? 0,
                    UsuarioID = item.UsuarioID ?? 0,
                    TipoMovimientoID = item.TipoMovimientoID ?? 0,
                    Cargo = item.Cargo,
                    Abono = item.Abono,
                    Motivo = item.Motivo,
                    bEliminado = item.bEliminado ?? false,
                    NombreCuenta = item.Cuenta,
                    TipoCuenta = item.TipoCuenta,
                    NombreUsuario = item.NombreUsuario,
                    TipoMovimiento = item.TipoMovimiento
                })
                .ToList();
        }

        public async Task<bool> SaveTransaccionAsync(TransaccionFormViewModel model)
        {
            if (model.TransaccionID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateTransaccionesInput!) {
                  createTransacciones(objInput: $objInput) {
                    transaccionID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        cuentaID = model.CuentaID,
                        usuarioID = model.UsuarioID,
                        tipoMovimientoID = model.TipoMovimientoID,
                        cargo = model.Cargo,
                        abono = model.Abono,
                        motivo = model.Motivo,
                        bEliminado = model.bEliminado
                    }
                });

                return true;
            }

            const string updateMutation = """
            mutation ($objInput: clUpdateTransaccionesInput!) {
              updateTransacciones(objInput: $objInput) {
                transaccionID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(updateMutation, new
            {
                objInput = new
                {
                    transaccionID = model.TransaccionID,
                    cuentaID = model.CuentaID,
                    usuarioID = model.UsuarioID,
                    tipoMovimientoID = model.TipoMovimientoID,
                    cargo = model.Cargo,
                    abono = model.Abono,
                    motivo = model.Motivo,
                    bEliminado = model.bEliminado
                }
            });

            return true;
        }

        public async Task<bool> DeleteTransaccionAsync(int transaccionId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteTransacciones(nTransaccionesID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = transaccionId });
            return true;
        }

        // ─── Juntas ────────────────────────────────────────────────────────────
        public async Task<IReadOnlyList<JuntaFormViewModel>> GetJuntasAsync()
        {
            const string query = """
            query ($first: Int!) {
              getJuntas(first: $first) {
                edges {
                  node {
                    juntaID
                    titulo
                    descripcion
                    fechaProgramada
                    ubicacion
                    bActivo
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<JuntasQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetJuntas);
        }

        public async Task<bool> SaveJuntaAsync(JuntaFormViewModel model)
        {
            if (model.JuntaID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateJuntasInput!) {
                  createJuntas(objInput: $objInput) {
                    juntaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        titulo = model.Titulo,
                        descripcion = model.Descripcion ?? string.Empty,
                        fechaProgramada = EnsureUtcKind(model.FechaProgramada ?? DateTime.UtcNow),
                        ubicacion = model.Ubicacion ?? string.Empty,
                        bActivo = model.bActivo,
                        bEliminado = model.bEliminado
                    }
                });
            }
            else
            {
                const string mutation = """
                mutation ($objInput: clUpdateJuntasInput!) {
                  updateJuntas(objInput: $objInput) {
                    juntaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        juntaID = model.JuntaID,
                        titulo = model.Titulo,
                        descripcion = model.Descripcion,
                        fechaProgramada = model.FechaProgramada.HasValue ? (DateTime?)EnsureUtcKind(model.FechaProgramada.Value) : null,
                        ubicacion = model.Ubicacion,
                        bActivo = (bool?)model.bActivo,
                        bEliminado = (bool?)model.bEliminado
                    }
                });
            }

            return true;
        }

        public async Task<bool> DeleteJuntaAsync(int juntaId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteJuntas(nJuntasID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = juntaId });
            return true;
        }

        // ─── Documentos / Archivos ────────────────────────────────────────────
        public async Task<IReadOnlyList<ArchivoFormViewModel>> GetAllArchivosAsync()
        {
            const string query = """
            query ($first: Int!) {
              getArchivos(first: $first) {
                edges {
                  node {
                    archivoID
                    nombre
                    ruta
                    tipoArchivoID
                    tipoArchivo
                    esPrivado
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<AllArchivosQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetArchivos);
        }

        public async Task<bool> SaveDocumentoAsync(ArchivoFormViewModel model)
        {
            if (model.ArchivoID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateArchivosInput!) {
                  createArchivos(objInput: $objInput) {
                    archivoID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        nombre = model.Nombre,
                        ruta = model.Ruta ?? string.Empty,
                        tipoArchivoID = model.TipoArchivoID,
                        esPrivado = model.EsPrivado,
                        bEliminado = model.bEliminado
                    }
                });
            }
            else
            {
                const string mutation = """
                mutation ($objInput: clUpdateArchivosInput!) {
                  updateArchivos(objInput: $objInput) {
                    archivoID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        archivoID = model.ArchivoID,
                        nombre = model.Nombre,
                        ruta = model.Ruta,
                        tipoArchivoID = model.TipoArchivoID,
                        esPrivado = (bool?)model.EsPrivado,
                        bEliminado = (bool?)model.bEliminado
                    }
                });
            }

            return true;
        }

        // ─── Notificaciones Grupales ──────────────────────────────────────────
        public async Task<IReadOnlyList<NotificacionFormViewModel>> GetNotificacionesAsync()
        {
            const string query = """
            query ($first: Int!) {
              getNotificaciones(first: $first) {
                edges {
                  node {
                    notificacionID
                    usuarioID
                    titulo
                    mensaje
                    leido
                    fechaCreacionNotificacion
                    tipoNotificacionID
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<NotificacionesQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetNotificaciones);
        }

        public async Task<bool> SaveNotificacionAsync(NotificacionFormViewModel model)
        {
            if (model.NotificacionID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateNotificacionesInput!) {
                  createNotificaciones(objInput: $objInput) {
                    notificacionID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        usuarioID = model.UsuarioID ?? 0,
                        titulo = model.Titulo,
                        mensaje = model.Mensaje ?? string.Empty,
                        leido = model.Leido,
                        fechaCreacionNotificacion = EnsureUtcKind(model.FechaCreacionNotificacion ?? DateTime.UtcNow),
                        tipoNotificacionID = model.TipoNotificacionID,
                        bEliminado = model.bEliminado
                    }
                });
            }
            else
            {
                const string mutation = """
                mutation ($objInput: clUpdateNotificacionesInput!) {
                  updateNotificaciones(objInput: $objInput) {
                    notificacionID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        notificacionID = model.NotificacionID,
                        usuarioID = model.UsuarioID,
                        titulo = model.Titulo,
                        mensaje = model.Mensaje,
                        leido = (bool?)model.Leido,
                        fechaCreacionNotificacion = model.FechaCreacionNotificacion.HasValue
                            ? (DateTime?)EnsureUtcKind(model.FechaCreacionNotificacion.Value)
                            : null,
                        tipoNotificacionID = model.TipoNotificacionID,
                        bEliminado = (bool?)model.bEliminado
                    }
                });
            }

            return true;
        }

        public async Task<bool> DeleteNotificacionAsync(int notificacionId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteNotificaciones(nNotificacionesID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = notificacionId });
            return true;
        }

        // ─── Perfil ───────────────────────────────────────────────────────────
        public async Task<PerfilViewModel?> GetPerfilByCorreoAsync(string correo)
        {
            const string query = """
            query ($first: Int!, $correo: String!) {
              getUsuarios(first: $first, where: { correoUsuario: { eq: $correo } }) {
                edges {
                  node {
                    usuarioID
                    nombreUsuario
                    correoUsuario
                    telefonoUsuario
                    fotoUrlUsuario
                    bActivoUsuario
                    bEliminado
                    perfilID
                    bAdministrador
                    bActualizarPassword
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<UsuariosPerfilQueryEnvelope>(query, new { first = 1, correo = correo.Trim().ToLowerInvariant() });
            var node = response.GetUsuarios?.Edges?
                .Select(e => e.Node)
                .FirstOrDefault(n => n is not null);

            if (node is null) return null;

            return new PerfilViewModel
            {
                UsuarioID       = node.UsuarioID,
                NombreUsuario   = node.NombreUsuario   ?? string.Empty,
                CorreoUsuario   = node.CorreoUsuario   ?? correo,
                TelefonoUsuario = node.TelefonoUsuario,
                FotoUrlUsuario  = node.FotoUrlUsuario,
                PerfilID        = node.PerfilID,
                bAdministrador  = node.BAdministrador ?? false,
                bActualizarPassword = node.BActualizarPassword ?? false,
            };
        }

        public async Task<bool> UpdatePerfilAsync(int usuarioId, string nombre, string? telefono, string? fotoUrl, string? correo = null)
        {
            const string mutation = """
            mutation ($objInput: clUpdateUsuariosInput!) {
              updateUsuarios(objInput: $objInput) {
                usuarioID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new
            {
                objInput = new
                {
                    usuarioID       = usuarioId,
                    nombreUsuario   = nombre,
                    telefonoUsuario = telefono,
                    fotoUrlUsuario  = fotoUrl,
                    correoUsuario   = correo,
                }
            });

            return true;
        }

        public async Task<bool> CambiarPasswordAsync(int usuarioId, string passwordNuevo)
        {
            const string mutation = """
            mutation ($objInput: clUpdateUsuariosInput!) {
              updateUsuarios(objInput: $objInput) {
                usuarioID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new
            {
                objInput = new
                {
                    usuarioID = usuarioId,
                    passwordUsuario = passwordNuevo,
                    bActualizarPassword = (bool?)false
                }
            });

            return true;
        }

        public async Task<int> CreateUsuarioCondominoAsync(string correo, string nombre, string password, int perfilId)
        {
            const string mutation = """
            mutation ($objInput: clCreateUsuariosInput!) {
              createUsuarios(objInput: $objInput) {
                usuarioID
              }
            }
            """;

            var result = await GraphQLService.MutationAsync<UsuarioIdMutationEnvelope>(mutation, new
            {
                objInput = new
                {
                    correoUsuario       = correo,
                    nombreUsuario       = nombre,
                    passwordUsuario     = password,
                    perfilID            = perfilId,
                    bActivoUsuario      = true,
                    bEliminado          = false,
                    bActualizarPassword = true,
                    telefonoUsuario     = string.Empty,
                    fotoUrlUsuario      = string.Empty
                }
            });

            return result.CreateUsuarios?.UsuarioID
                ?? throw new InvalidOperationException("No se pudo crear el usuario condomino.");
        }

        // ─── Residente — Mascotas y Automoviles ───────────────────────────────
        public async Task<IReadOnlyList<MascotaFormViewModel>> GetMascotasByUsuarioAsync(int usuarioId)
        {
            const string query = """
            query ($first: Int!, $usuarioId: Int!) {
              getMascotas(first: $first, where: { usuarioID: { eq: $usuarioId } }) {
                edges {
                  node {
                    mascotaID
                    usuarioID
                    nombreMascota
                    tipoMascotaID
                    razaMascotaID
                    razaLibre
                    razaMascota
                    fechaNacimiento
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<MascotasQueryEnvelope>(query, new { first = 50, usuarioId });
            var nodes = ExtractNodes(response.GetMascotas);
            return nodes.Select(n => new MascotaFormViewModel
            {
                MascotaID = n.MascotaID,
              Nombre = n.NombreMascota ?? string.Empty,
              RazaLibre = n.RazaLibre ?? n.RazaMascota ?? string.Empty
            }).ToList();
        }

        public async Task<bool> SaveMascotaAsync(MascotaFormViewModel model)
        {
            string? correlationId = null;
            if (model.MascotaID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateMascotasInput!) {
                  createMascotas(objInput: $objInput) {
                    mascotaID
                  }
                }
                """;
                var variablesCreate = new
                {
                    objInput = new
                    {
                      usuarioID = model.UsuarioID ?? 0,
                      nombreMascota = model.Nombre,
                      tipoMascotaID = (int?)null,
                      razaMascotaID = (int?)null,
                      razaLibre = model.RazaLibre,
                      fechaNacimiento = (DateTime?)null,
                      bEliminado = false
                    }
                };
                try
                {
                  var ctx = _httpContextAccessor?.HttpContext;
                  if (ctx != null)
                  {
                    if (ctx.Items.TryGetValue("cid", out var correlationValue) && correlationValue != null)
                    {
                      correlationId = correlationValue.ToString();
                    }
                    else if (ctx.Request.Headers.TryGetValue("WindowName", out var wn))
                    {
                      var windowName = wn.FirstOrDefault();
                      if (!string.IsNullOrWhiteSpace(windowName))
                        correlationId = windowName;
                    }
                  }
                }
                catch { }
                if (string.IsNullOrWhiteSpace(correlationId)) correlationId = Guid.NewGuid().ToString();
                try
                {
                    var logDir = Path.Combine(Directory.GetCurrentDirectory(), "tmp");
                    Directory.CreateDirectory(logDir);
                    var logPath = Path.Combine(logDir, "debug_graphql_calls.log");
                    var entry = $"{DateTime.UtcNow:O} | CREATE mutation | cid={correlationId} | variables={System.Text.Json.JsonSerializer.Serialize(variablesCreate)}{Environment.NewLine}";
                    System.IO.File.AppendAllText(logPath, entry);
                }
                catch { }

                await GraphQLService.MutationAsync<object>(
                  mutation,
                  variablesCreate,
                  operationName: null,
                  userId: (model.UsuarioID ?? 0).ToString(),
                  windowName: correlationId);
            }
            else
            {
                const string mutation = """
                mutation ($objInput: clUpdateMascotasInput!) {
                  updateMascotas(objInput: $objInput) {
                    mascotaID
                  }
                }
                """;
                var variablesUpdate = new
                {
                    objInput = new
                    {
                      mascotaID = model.MascotaID,
                      nombreMascota = model.Nombre,
                      razaLibre = model.RazaLibre
                    }
                };
                try
                {
                  var ctx = _httpContextAccessor?.HttpContext;
                  if (ctx != null)
                  {
                    if (ctx.Items.TryGetValue("cid", out var correlationValue) && correlationValue != null)
                    {
                      correlationId = correlationValue.ToString();
                    }
                    else if (ctx.Request.Headers.TryGetValue("WindowName", out var wn))
                    {
                      var windowName = wn.FirstOrDefault();
                      if (!string.IsNullOrWhiteSpace(windowName))
                        correlationId = windowName;
                    }
                  }
                }
                catch { }
                if (string.IsNullOrWhiteSpace(correlationId)) correlationId = Guid.NewGuid().ToString();
                try
                {
                    var logDir = Path.Combine(Directory.GetCurrentDirectory(), "tmp");
                    Directory.CreateDirectory(logDir);
                    var logPath = Path.Combine(logDir, "debug_graphql_calls.log");
                    var entry = $"{DateTime.UtcNow:O} | UPDATE mutation | cid={correlationId} | variables={System.Text.Json.JsonSerializer.Serialize(variablesUpdate)}{Environment.NewLine}";
                    System.IO.File.AppendAllText(logPath, entry);
                }
                catch { }

                await GraphQLService.MutationAsync<object>(
                  mutation,
                  variablesUpdate,
                  operationName: null,
                  userId: (model.UsuarioID ?? 0).ToString(),
                  windowName: correlationId);
            }

            return true;
        }

        public async Task<bool> DeleteMascotaAsync(int mascotaId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteMascotas(nMascotasID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = mascotaId });
            return true;
        }

        public async Task<IReadOnlyList<AutomovilFormViewModel>> GetAutomovilesByUsuarioAsync(int usuarioId)
        {
            const string query = """
            query ($first: Int!, $usuarioId: Int!) {
              getAutomoviles(first: $first, where: { usuarioID: { eq: $usuarioId } }) {
                edges {
                  node {
                    automovilID
                    usuarioID
                    marcaID
                    marca
                    modeloID
                    modeloID
                    modeloLibre
                    modelo
                    placas
                    color
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<AutomovilesQueryEnvelope>(query, new { first = 50, usuarioId });
            var nodes = ExtractNodes(response.GetAutomoviles);
            return nodes.Select(n => new AutomovilFormViewModel
            {
                AutomovilID = n.AutomovilID,
              ModeloLibre = n.ModeloLibre ?? n.Modelo ?? string.Empty,
                Placas = n.Placas ?? string.Empty
            }).ToList();
        }

        public async Task<bool> SaveAutomovilAsync(AutomovilFormViewModel model)
        {
          string? correlationId = null;
            if (model.AutomovilID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateAutomovilesInput!) {
                  createAutomoviles(objInput: $objInput) {
                    automovilID
                  }
                }
                """;

                var variablesCreate = new
                {
                    objInput = new
                    {
                      usuarioID = model.UsuarioID ?? 0,
                      marcaID = (int?)null,
                      modeloID = (int?)null,
                      modeloLibre = model.ModeloLibre,
                      placas = model.Placas,
                      color = string.Empty,
                      bEliminado = false
                    }
                };
                try
                {
                    var logDir = Path.Combine(Directory.GetCurrentDirectory(), "tmp");
                    Directory.CreateDirectory(logDir);
                    var logPath = Path.Combine(logDir, "debug_graphql_calls.log");
                    var entry = $"{DateTime.UtcNow:O} | CREATE mutation | cid={correlationId} | variables={System.Text.Json.JsonSerializer.Serialize(variablesCreate)}{Environment.NewLine}";
                    System.IO.File.AppendAllText(logPath, entry);
                }
                catch { }

                await GraphQLService.MutationAsync<object>(
                  mutation,
                  variablesCreate,
                  operationName: null,
                  userId: (model.UsuarioID ?? 0).ToString(),
                  windowName: correlationId);
            }
            else
            {
                const string mutation = """
                mutation ($objInput: clUpdateAutomovilesInput!) {
                  updateAutomoviles(objInput: $objInput) {
                    automovilID
                  }
                }
                """;

                var variablesUpdate = new
                {
                    objInput = new
                    {
                      automovilID = model.AutomovilID,
                      placas = model.Placas,
                      color = string.Empty,
                      modeloLibre = model.ModeloLibre
                    }
                };
                try
                {
                    var logDir = Path.Combine(Directory.GetCurrentDirectory(), "tmp");
                    Directory.CreateDirectory(logDir);
                    var logPath = Path.Combine(logDir, "debug_graphql_calls.log");
                    var entry = $"{DateTime.UtcNow:O} | UPDATE mutation | cid={correlationId} | variables={System.Text.Json.JsonSerializer.Serialize(variablesUpdate)}{Environment.NewLine}";
                    System.IO.File.AppendAllText(logPath, entry);
                }
                catch { }

                await GraphQLService.MutationAsync<object>(
                  mutation,
                  variablesUpdate,
                  operationName: null,
                  userId: (model.UsuarioID ?? 0).ToString(),
                  windowName: correlationId);
            }

            return true;
        }

        public async Task<bool> DeleteAutomovilAsync(int automovilId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteAutomoviles(nAutomovilesID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = automovilId });
            return true;
        }

        // ─── Encuestas ────────────────────────────────────────────────────────
        public async Task<IReadOnlyList<EncuestaFormViewModel>> GetEncuestasAsync()
        {
            const string query = """
            query ($first: Int!) {
              getEncuestas(first: $first) {
                edges {
                  node {
                    encuestaID
                    titulo
                    descripcion
                    fechaInicio
                    fechaFin
                    bActivo
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<EncuestasQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetEncuestas);
        }

        public async Task<bool> SaveEncuestaAsync(EncuestaFormViewModel model)
        {
            if (model.EncuestaID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateEncuestasInput!) {
                  createEncuestas(objInput: $objInput) {
                    encuestaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        titulo = model.Titulo,
                        descripcion = model.Descripcion ?? string.Empty,
                        fechaInicio = EnsureUtcKind(model.FechaInicio ?? DateTime.UtcNow),
                        fechaFin = model.FechaFin.HasValue ? (DateTime?)EnsureUtcKind(model.FechaFin.Value) : null,
                        bActivo = model.bActivo,
                        bEliminado = model.bEliminado
                    }
                });
            }
            else
            {
                const string mutation = """
                mutation ($objInput: clUpdateEncuestasInput!) {
                  updateEncuestas(objInput: $objInput) {
                    encuestaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        encuestaID = model.EncuestaID,
                        titulo = model.Titulo,
                        descripcion = model.Descripcion,
                        fechaInicio = model.FechaInicio.HasValue ? (DateTime?)EnsureUtcKind(model.FechaInicio.Value) : null,
                        fechaFin = model.FechaFin.HasValue ? (DateTime?)EnsureUtcKind(model.FechaFin.Value) : null,
                        bActivo = (bool?)model.bActivo,
                        bEliminado = (bool?)model.bEliminado
                    }
                });
            }

            return true;
        }

        public async Task<bool> DeleteEncuestaAsync(int encuestaId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteEncuestas(nEncuestasID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = encuestaId });
            return true;
        }

        public async Task<IReadOnlyList<PreguntaFormViewModel>> GetPreguntasAsync(int encuestaId)
        {
            const string query = """
            query ($first: Int!, $encuestaId: Int!) {
              getPreguntas(first: $first, where: { encuestaID: { eq: $encuestaId } }) {
                edges {
                  node {
                    preguntaID
                    encuestaID
                    texto
                    tipoPreguntaID
                    orden
                    requerida
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<PreguntasQueryEnvelope>(query, new { first = 50, encuestaId });
            return ExtractNodes(response.GetPreguntas);
        }

        public async Task<bool> SavePreguntaAsync(PreguntaFormViewModel model)
        {
            if (model.PreguntaID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreatePreguntasInput!) {
                  createPreguntas(objInput: $objInput) {
                    preguntaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        encuestaID = model.EncuestaID ?? 0,
                        texto = model.Texto,
                        tipoPreguntaID = model.TipoPreguntaID ?? 1,
                        orden = model.Orden ?? 0,
                        requerida = model.Requerida,
                        bEliminado = model.bEliminado
                    }
                });
            }
            else
            {
                const string mutation = """
                mutation ($objInput: clUpdatePreguntasInput!) {
                  updatePreguntas(objInput: $objInput) {
                    preguntaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        preguntaID = model.PreguntaID,
                        encuestaID = model.EncuestaID,
                        texto = model.Texto,
                        tipoPreguntaID = model.TipoPreguntaID ?? 1,
                        orden = model.Orden,
                        requerida = (bool?)model.Requerida,
                        bEliminado = (bool?)model.bEliminado
                    }
                });
            }

            return true;
        }

        public async Task<bool> DeletePreguntaAsync(int preguntaId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deletePreguntas(nPreguntasID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = preguntaId });
            return true;
        }

        public async Task<IReadOnlyList<OpcionPreguntaFormViewModel>> GetOpcionesAsync(int encuestaId)
        {
            const string query = """
            query ($first: Int!) {
              getOpcionesPreguntas(first: $first, where: { bEliminado: { eq: false } }) {
                edges {
                  node {
                    opcionPreguntaID
                    preguntaID
                    texto
                    valor
                    orden
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<OpcionesQueryEnvelope>(query, new { first = 50 });
            return ExtractNodes(response.GetOpcionesPreguntas);
        }

        public async Task<bool> SaveOpcionAsync(OpcionPreguntaFormViewModel model)
        {
            if (model.OpcionPreguntaID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateOpcionesPreguntaInput!) {
                  createOpcionesPregunta(objInput: $objInput) {
                    opcionPreguntaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        preguntaID = model.PreguntaID ?? 0,
                        texto = model.Texto,
                        valor = model.Valor ?? model.Texto,
                        orden = model.Orden ?? 0,
                        bEliminado = model.bEliminado
                    }
                });
            }
            else
            {
                const string mutation = """
                mutation ($objInput: clUpdateOpcionesPreguntaInput!) {
                  updateOpcionesPregunta(objInput: $objInput) {
                    opcionPreguntaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        opcionPreguntaID = model.OpcionPreguntaID,
                        preguntaID = model.PreguntaID,
                        texto = model.Texto,
                        valor = model.Valor,
                        orden = model.Orden,
                        bEliminado = (bool?)model.bEliminado
                    }
                });
            }

            return true;
        }

        public async Task<bool> DeleteOpcionAsync(int opcionId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteOpcionesPregunta(nOpcionesPreguntaID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = opcionId });
            return true;
        }

        // ─── Encuestas — Residente ────────────────────────────────────────────
        public async Task<bool> EncuestaYaRespondidaAsync(int encuestaId, int usuarioId)
        {
            const string query = """
            query ($encuestaId: Int!, $usuarioId: Int!) {
              getRespuestas(first: 1, where: { and: [
                { encuestaID: { eq: $encuestaId } },
                { usuarioID:  { eq: $usuarioId  } },
                { bEliminado: { eq: false        } }
              ]}) {
                edges { node { respuestaID } }
              }
            }
            """;
            var response = await GraphQLService.QueryAsync<RespuestasQueryEnvelope>(query, new { encuestaId, usuarioId });
            return response.GetRespuestas?.Edges?.Count > 0;
        }

        public async Task SaveRespuestasEncuestaAsync(int encuestaId, int usuarioId, IReadOnlyList<RespuestaEncuestaItemViewModel> respuestas)
        {
            const string mutation = """
            mutation ($objInput: clCreateRespuestasInput!) {
              createRespuestas(objInput: $objInput) { respuestaID }
            }
            """;

            var now = DateTime.UtcNow;

            foreach (var item in respuestas)
            {
                if (item.OpcionesSeleccionadas.Count > 0)
                {
                    foreach (var opcionId in item.OpcionesSeleccionadas)
                    {
                        await GraphQLService.MutationAsync<object>(mutation, new
                        {
                            objInput = new
                            {
                                encuestaID       = encuestaId,
                                preguntaID       = item.PreguntaID,
                                usuarioID        = usuarioId,
                                opcionPreguntaID = (int?)opcionId,
                                respuestaTexto   = string.Empty,
                                fechaRespuesta   = now,
                                bEliminado       = false
                            }
                        });
                    }
                }
                else
                {
                    await GraphQLService.MutationAsync<object>(mutation, new
                    {
                        objInput = new
                        {
                            encuestaID       = encuestaId,
                            preguntaID       = item.PreguntaID,
                            usuarioID        = usuarioId,
                            opcionPreguntaID = (int?)null,
                            respuestaTexto   = item.RespuestaTexto ?? string.Empty,
                            fechaRespuesta   = now,
                            bEliminado       = false
                        }
                    });
                }
            }
        }

        // ─── Encuestas — Resultados ───────────────────────────────────────────
        public async Task<ResultadosEncuestaViewModel> GetResultadosEncuestaAsync(int encuestaId)
        {
            // Fetch encuesta header
            var encuestas = await GetEncuestasAsync();
            var encuesta  = encuestas.FirstOrDefault(e => e.EncuestaID == encuestaId)
                            ?? new EncuestaFormViewModel { EncuestaID = encuestaId, Titulo = "Encuesta" };

            // Fetch preguntas + opciones
            var preguntas = await GetPreguntasAsync(encuestaId);
            var opciones  = await GetOpcionesAsync(encuestaId);

            // Fetch ALL responses for this encuesta
            const string query = """
            query ($encuestaId: Int!) {
              getRespuestas(first: 1000, where: { and: [
                { encuestaID: { eq: $encuestaId } },
                { bEliminado:  { eq: false       } }
              ]}) {
                edges {
                  node {
                    respuestaID
                    preguntaID
                    usuarioID
                    opcionPreguntaID
                    respuestaTexto
                    fechaRespuesta
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<RespuestasQueryEnvelope>(query, new { encuestaId });
            var rawList  = ExtractNodes(response.GetRespuestas)
                .Select(n => new RespuestaRawViewModel
                {
                    RespuestaID      = n.RespuestaID,
                    PreguntaID       = n.PreguntaID,
                    UsuarioID        = n.UsuarioID,
                    OpcionPreguntaID = n.OpcionPreguntaID,
                    RespuestaTexto   = n.RespuestaTexto,
                    FechaRespuesta   = n.FechaRespuesta
                })
                .ToList();

            // Total participantes = unique usuarioIDs
            int totalParticipantes = rawList.Select(r => r.UsuarioID).Distinct().Count();

            // Build per-question results
            var resultadosPreguntas = new List<ResultadoPreguntaViewModel>();
            foreach (var p in preguntas.OrderBy(x => x.Orden))
            {
                var pregRespuestas = rawList.Where(r => r.PreguntaID == p.PreguntaID).ToList();
                var resultado = new ResultadoPreguntaViewModel
                {
                    PreguntaID      = p.PreguntaID ?? 0,
                    Texto           = p.Texto ?? string.Empty,
                    TipoPreguntaID  = p.TipoPreguntaID ?? 1,
                    Orden           = p.Orden ?? 0,
                    TotalRespuestas = pregRespuestas.Count
                };

                switch (p.TipoPreguntaID)
                {
                    case 2: // Opcion unica
                    case 3: // Opcion multiple
                        var opcsDePreg = opciones.Where(o => o.PreguntaID == p.PreguntaID).OrderBy(o => o.Orden).ToList();
                        int totalVotos = pregRespuestas.Count(r => r.OpcionPreguntaID.HasValue);
                        foreach (var opc in opcsDePreg)
                        {
                            int conteo = pregRespuestas.Count(r => r.OpcionPreguntaID == opc.OpcionPreguntaID);
                            resultado.ConteoPorOpcion.Add(new ResultadoOpcionViewModel
                            {
                                OpcionPreguntaID = opc.OpcionPreguntaID ?? 0,
                                Texto            = opc.Texto ?? string.Empty,
                                Conteo           = conteo,
                                Porcentaje       = totalVotos > 0 ? Math.Round((double)conteo / totalVotos * 100, 1) : 0
                            });
                        }
                        break;
                    case 4: // Escala 1-5
                        var valores = pregRespuestas
                            .Where(r => r.OpcionPreguntaID.HasValue)
                            .Select(r => (double)r.OpcionPreguntaID!.Value)
                            .ToList();
                        if (!valores.Any())
                        {
                            // also try parsing respuestaTexto as number
                            valores = pregRespuestas
                                .Where(r => int.TryParse(r.RespuestaTexto, out _))
                                .Select(r => (double)int.Parse(r.RespuestaTexto!))
                                .ToList();
                        }
                        resultado.PromedioEscala = valores.Any() ? Math.Round(valores.Average(), 2) : null;
                        // Show bar per value 1-5
                        for (int v = 1; v <= 5; v++)
                        {
                            int cnt = pregRespuestas.Count(r =>
                                r.OpcionPreguntaID == v ||
                                (int.TryParse(r.RespuestaTexto, out int tv) && tv == v));
                            resultado.ConteoPorOpcion.Add(new ResultadoOpcionViewModel
                            {
                                OpcionPreguntaID = v,
                                Texto            = $"{'★'.ToString().PadLeft(v, '★')} ({v})",
                                Conteo           = cnt,
                                Porcentaje       = resultado.TotalRespuestas > 0 ? Math.Round((double)cnt / resultado.TotalRespuestas * 100, 1) : 0
                            });
                        }
                        break;
                    default: // Texto libre (1) y Fecha (5)
                        resultado.Textos = pregRespuestas
                            .Where(r => !string.IsNullOrWhiteSpace(r.RespuestaTexto))
                            .Select(r => r.RespuestaTexto!)
                            .ToList();
                        break;
                }
                resultadosPreguntas.Add(resultado);
            }

            return new ResultadosEncuestaViewModel
            {
                Encuesta           = encuesta,
                Preguntas          = resultadosPreguntas,
                TotalParticipantes = totalParticipantes
            };
        }

        // ─── Dashboard ────────────────────────────────────────────────────────
        public async Task<DashboardViewModel> GetDashboardSummaryAsync()
        {
            var today = DateTime.UtcNow.Date;

            var condominiosTask    = GetCondominiosAsync();
            var casasTask          = GetCasasAsync();
            var visitasTask        = GetVisitasAsync();
            var pasesTask          = GetPasesQrAsync();
            var reservasTask       = GetReservasAmenidadesAsync();
            var ticketsTask        = GetTicketsAsync();
            var encuestasTask      = GetEncuestasAsync();
            var cuotasTask         = GetCuotasAsync();

            await Task.WhenAll(condominiosTask, casasTask, visitasTask, pasesTask,
                               reservasTask, ticketsTask, encuestasTask, cuotasTask);

            var condominios = await condominiosTask;
            var casas       = await casasTask;
            var visitas     = await visitasTask;
            var pases       = await pasesTask;
            var reservas    = await reservasTask;
            var tickets     = await ticketsTask;
            var encuestas   = await encuestasTask;
            var cuotas      = await cuotasTask;

            var now = DateTime.UtcNow;

            return new DashboardViewModel
            {
                CondominiosActivos = condominios.Count(c => c.bEliminado == false),
                CasasActivas       = casas.Count(c => c.bEliminado == false),
                VisitasHoy         = visitas.Count(v => v.bEliminado == false
                                         && v.FechaEntrada.Date == today),
                PasesVigentes      = pases.Count(p => p.bEliminado == false
                                         && p.bUsado == false
                                         && (p.FechaExpira == null || p.FechaExpira.Value.ToUniversalTime() > now)),
                ReservasProximas   = reservas.Count(r => r.bEliminado != true
                                         && r.FechaInicio.ToUniversalTime() >= now),
                TicketsAbiertos    = tickets.Count(t => t.bEliminado == false
                                         && t.FechaCierre == null),
                EncuestasActivas   = encuestas.Count(e => e.bEliminado == false && e.bActivo),
                CuotasPendientes   = cuotas.Count(c => c.bEliminado == false && c.Pagado == false),
            };
        }

        private static DateTime EnsureUtcKind(DateTime value)
          {
            return value.Kind == DateTimeKind.Utc
              ? value
              : DateTime.SpecifyKind(value, DateTimeKind.Utc);
          }

        private static IReadOnlyList<TModel> ExtractNodes<TModel>(GraphqlConnection<TModel>? connection)
            where TModel : class
        {
            if (connection?.Edges is null || connection.Edges.Count == 0)
            {
                return Array.Empty<TModel>();
            }

            return connection.Edges
                .Select(edge => edge.Node)
                .Where(node => node is not null)
                .Select(node => node!)
                .ToList();
        }

        public async Task<IReadOnlyList<PerfilMenuItemViewModel>> GetPerfilMenusAsync(int perfilId)
        {
            const string query = """
            query ($first: Int!, $perfilId: Int!) {
              getPerfilMenus(first: $first, where: { perfilID: { eq: $perfilId }, bVisible: { eq: true }, bEliminado: { eq: false } }) {
                edges {
                  node {
                    perfilMenuID
                    perfilID
                    menuID
                    tituloMenu
                    ruta
                    icono
                    orden
                    padreMenuID
                    bVisible
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<PerfilMenusQueryEnvelope>(query, new { first = 50, perfilId });
            return (response.GetPerfilMenus?.Edges ?? Enumerable.Empty<GraphqlEdge<PerfilMenuRawNode>>())
                .Select(e => e.Node)
                .Where(n => n is not null)
                .Select(n => new PerfilMenuItemViewModel
                {
                    MenuID      = n!.MenuID    ?? 0,
                    TituloMenu  = n.TituloMenu ?? string.Empty,
                    Ruta        = n.Ruta,
                    Icono       = n.Icono,
                    Orden       = n.Orden      ?? 0,
                    PadreMenuID = n.PadreMenuID,
                    bVisible    = n.bVisible   ?? true,
                })
                .ToList();
        }

        public async Task<IReadOnlyList<PerfilMenuBotonItemViewModel>> GetPerfilMenuBotonAsync(int perfilId)
        {
            const string query = """
            query ($first: Int!, $perfilId: Int!) {
              getPerfilMenuBotones(first: $first, where: { perfilID: { eq: $perfilId }, bActivo: { eq: true }, bEliminado: { eq: false } }) {
                edges {
                  node {
                    perfilMenuBotonID
                    perfilID
                    menuBotonID
                    menuID
                    boton
                    accion
                    bActivo
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<PerfilMenuBotonQueryEnvelope>(query, new { first = 50, perfilId });
            return (response.GetPerfilMenuBotones?.Edges ?? Enumerable.Empty<GraphqlEdge<PerfilMenuBotonRawNode>>())
                .Select(e => e.Node)
                .Where(n => n is not null)
                .Select(n => new PerfilMenuBotonItemViewModel
                {
                    MenuBotonID = n!.MenuBotonID ?? 0,
                    MenuID      = n.MenuID       ?? 0,
                    Boton       = n.Boton        ?? string.Empty,
                    Accion      = n.Accion       ?? string.Empty,
                    bActivo     = n.bActivo      ?? true,
                })
                .ToList();
        }

        private sealed class CondominiosQueryEnvelope
        {
            public GraphqlConnection<CondominioFormViewModel>? GetCondominios { get; set; }
        }

        private sealed class UsuariosQueryEnvelope
        {
          public GraphqlConnection<UsuarioLookupViewModel>? GetUsuarios { get; set; }
        }

        private sealed class UsuariosPerfilQueryEnvelope
        {
            public GraphqlConnection<UsuarioPerfilRawNode>? GetUsuarios { get; set; }
        }

        private sealed class UsuarioIdMutationEnvelope
        {
            public UsuarioIdResult? CreateUsuarios { get; set; }
        }

        private sealed class UsuarioIdResult
        {
            public int? UsuarioID { get; set; }
        }

        private sealed class PerfilIdMutationEnvelope
        {
            public PerfilIdResult? CreatePerfiles { get; set; }
        }

        private sealed class PerfilIdResult
        {
            public int? PerfilID { get; set; }
        }

        private sealed class UsuarioPerfilRawNode
        {
            public int? UsuarioID       { get; set; }
            public string? NombreUsuario   { get; set; }
            public string? CorreoUsuario   { get; set; }
            public string? TelefonoUsuario { get; set; }
            public string? FotoUrlUsuario  { get; set; }
            public bool?  bActivoUsuario  { get; set; }
            public bool?  bEliminado      { get; set; }
            public int?   PerfilID        { get; set; }
            public bool?  BAdministrador  { get; set; }
            public bool?  BActualizarPassword { get; set; }
        }

        private sealed class TipoIdentificacionesQueryEnvelope
        {
          public GraphqlConnection<TipoIdentificacionLookupViewModel>? GetTipoIdentificacions { get; set; }
        }

        private sealed class TicketsQueryEnvelope
        {
          public GraphqlConnection<TicketBoardItemViewModel>? GetTickets { get; set; }
        }

        private sealed class EstadosTicketsQueryEnvelope
        {
          public GraphqlConnection<TicketBoardStateLookupViewModel>? GetEstadosTickets { get; set; }
        }

        private sealed class PrioridadTicketsQueryEnvelope
        {
          public GraphqlConnection<TicketBoardPriorityLookupViewModel>? GetPrioridadEstickets { get; set; }
        }

        private sealed class ComentariosTicketsQueryEnvelope
        {
          public GraphqlConnection<TicketBoardCommentViewModel>? GetComentariosTickets { get; set; }
        }

        private sealed class TicketsUsuariosAsignadosQueryEnvelope
        {
          public GraphqlConnection<TicketBoardAssignmentViewModel>? GetTicketsUsuariosAsignados { get; set; }
        }

        private sealed class DocumentosTicketsQueryEnvelope
        {
          public GraphqlConnection<DocumentosTicketNode>? GetDocumentosTickets { get; set; }
        }

        private sealed class ArchivosQueryEnvelope
        {
          public GraphqlConnection<ArchivoNode>? GetArchivos { get; set; }
        }

        private sealed class TicketIdMutationEnvelope
        {
          public TicketIdNode? CreateTickets { get; set; }
          public TicketIdNode? UpdateTickets { get; set; }
        }

        private sealed class ArchivoIdMutationEnvelope
        {
          public ArchivoIdNode? CreateArchivos { get; set; }
        }

        private sealed class TicketDocumentIdMutationEnvelope
        {
          public TicketDocumentIdNode? CreateDocumentosTicket { get; set; }
        }

        private sealed class TicketIdNode
        {
          public int? TicketID { get; set; }
        }

        private sealed class ArchivoIdNode
        {
          public int? ArchivoID { get; set; }
        }

        private sealed class TicketDocumentIdNode
        {
          public int? DocumentoTicketID { get; set; }
        }

        private sealed class DocumentosTicketNode
        {
          public int? DocumentoTicketID { get; set; }
          public int? TicketID { get; set; }
          public int? DocumentoID { get; set; }
          public bool? bEliminado { get; set; }
        }

        private sealed class ArchivoNode
        {
          public int? ArchivoID { get; set; }
          public string? Nombre { get; set; }
          public string? Ruta { get; set; }
          public string? TipoArchivo { get; set; }
          public int? TipoArchivoID { get; set; }
          public bool? EsPrivado { get; set; }
          public bool? bEliminado { get; set; }
        }

        private sealed class CasasQueryEnvelope
        {
            public GraphqlConnection<CasaFormViewModel>? GetCasas { get; set; }
        }

        private sealed class VisitasQueryEnvelope
        {
            public GraphqlConnection<VisitaFormViewModel>? GetVisitas { get; set; }
        }

        private sealed class PasesQrQueryEnvelope
        {
          public GraphqlConnection<PaseQrFormViewModel>? GetVisitasGeneradas { get; set; }
        }

        private sealed class ReservasAmenidadesQueryEnvelope
        {
          public GraphqlConnection<ReservaAmenidadFormViewModel>? GetReservacionesAreas { get; set; }
        }

        private sealed class ReservacionEstadosQueryEnvelope
        {
          public GraphqlConnection<ReservacionEstadoLookupViewModel>? GetReservacionesEstados { get; set; }
        }

        private sealed class AreasComunesQueryEnvelope
        {
            public GraphqlConnection<AreaComunFormViewModel>? GetAreasComunes { get; set; }
        }

        private sealed class CuentasQueryEnvelope
        {
            public GraphqlConnection<CuentaFormViewModel>? GetCuentas { get; set; }
        }

        private sealed class TiposMovimientoQueryEnvelope
        {
            public GraphqlConnection<TipoMovimientoLookupViewModel>? GetTiposMovimientos { get; set; }
        }

        private sealed class CuotasQueryEnvelope
        {
            public GraphqlConnection<CuotaFormViewModel>? GetCuotas { get; set; }
        }

        private sealed class TransaccionesQueryEnvelope
        {
            public GraphqlConnection<TransaccionRawNode>? GetTransacciones { get; set; }
        }

        private sealed class JuntasQueryEnvelope
        {
            public GraphqlConnection<JuntaFormViewModel>? GetJuntas { get; set; }
        }

        private sealed class AllArchivosQueryEnvelope
        {
            public GraphqlConnection<ArchivoFormViewModel>? GetArchivos { get; set; }
        }

        private sealed class NotificacionesQueryEnvelope
        {
            public GraphqlConnection<NotificacionFormViewModel>? GetNotificaciones { get; set; }
        }

        private sealed class EncuestasQueryEnvelope
        {
            public GraphqlConnection<EncuestaFormViewModel>? GetEncuestas { get; set; }
        }

        private sealed class PreguntasQueryEnvelope
        {
            public GraphqlConnection<PreguntaFormViewModel>? GetPreguntas { get; set; }
        }

        private sealed class OpcionesQueryEnvelope
        {
            public GraphqlConnection<OpcionPreguntaFormViewModel>? GetOpcionesPreguntas { get; set; }
        }

        private sealed class RespuestasQueryEnvelope
        {
            public GraphqlConnection<RespuestaReadNode>? GetRespuestas { get; set; }
        }

        private sealed class RespuestaReadNode
        {
            public int? RespuestaID { get; set; }
            public int? PreguntaID { get; set; }
            public int? UsuarioID { get; set; }
            public int? OpcionPreguntaID { get; set; }
            public string? RespuestaTexto { get; set; }
            public DateTime? FechaRespuesta { get; set; }
        }

        private sealed class TransaccionRawNode
        {
            public int? TransaccionID { get; set; }
            public int? CuentaID { get; set; }
            public string? Cuenta { get; set; }
            public string? TipoCuenta { get; set; }
            public int? UsuarioID { get; set; }
            public string? NombreUsuario { get; set; }
            public int? TipoMovimientoID { get; set; }
            public string? TipoMovimiento { get; set; }
            public decimal? Cargo { get; set; }
            public decimal? Abono { get; set; }
            public string? Motivo { get; set; }
            public bool? bEliminado { get; set; }
        }

        private sealed class GraphqlConnection<TModel>
            where TModel : class
        {
            public List<GraphqlEdge<TModel>>? Edges { get; set; }
        }

        private sealed class GraphqlEdge<TModel>
            where TModel : class
        {
            public TModel? Node { get; set; }
        }

        private sealed class PerfilMenusQueryEnvelope
        {
            public GraphqlConnection<PerfilMenuRawNode>? GetPerfilMenus { get; set; }
        }

        private sealed class PerfilMenuRawNode
        {
            public int?    PerfilMenuID { get; set; }
            public int?    PerfilID     { get; set; }
            public int?    MenuID       { get; set; }
            public string? TituloMenu   { get; set; }
            public string? Ruta         { get; set; }
            public string? Icono        { get; set; }
            public int?    Orden        { get; set; }
            public int?    PadreMenuID  { get; set; }
            public bool?   bVisible     { get; set; }
        }

        private sealed class PerfilMenuBotonQueryEnvelope
        {
            public GraphqlConnection<PerfilMenuBotonRawNode>? GetPerfilMenuBotones { get; set; }
        }

        private sealed class PerfilMenuBotonRawNode
        {
            public int?    PerfilMenuBotonID { get; set; }
            public int?    PerfilID          { get; set; }
            public int?    MenuBotonID       { get; set; }
            public int?    MenuID            { get; set; }
            public string? Boton             { get; set; }
            public string? Accion            { get; set; }
            public bool?   bActivo           { get; set; }
        }

        // Envelopes para Mascotas y Automoviles
        private sealed class MascotasQueryEnvelope
        {
          public GraphqlConnection<MascotaNode>? GetMascotas { get; set; }
        }

        private sealed class MascotaNode
        {
          public int? MascotaID { get; set; }
          public int? UsuarioID { get; set; }
          public string? NombreMascota { get; set; }
          public int? TipoMascotaID { get; set; }
          public int? RazaMascotaID { get; set; }
          public string? RazaMascota { get; set; }
          public string? RazaLibre { get; set; }
          public DateTime? FechaNacimiento { get; set; }
          public bool? bEliminado { get; set; }
          public string? Nombre { get; set; }
        }

        private sealed class AutomovilesQueryEnvelope
        {
          public GraphqlConnection<AutomovilNode>? GetAutomoviles { get; set; }
        }

        private sealed class AutomovilNode
        {
          public int? AutomovilID { get; set; }
          public int? UsuarioID { get; set; }
          public int? MarcaID { get; set; }
          public string? Marca { get; set; }
          public int? ModeloID { get; set; }
          public string? Modelo { get; set; }
          public string? ModeloLibre { get; set; }
          public string? Placas { get; set; }
          public string? Color { get; set; }
          public bool? bEliminado { get; set; }
        }

        // ─── Admin SGR — Perfiles ─────────────────────────────────────────────

        public async Task<int> EnsurePerfilCondominoAsync()
        {
            var perfiles = await GetSgrPerfilesAsync();
            var existing = perfiles.FirstOrDefault(p =>
                p.Perfil.Equals("CONDOMINO", StringComparison.OrdinalIgnoreCase));

            if (existing?.PerfilID is not null)
                return existing.PerfilID.Value;

            // No existe — crear perfil CONDOMINO automáticamente
            const string mutation = """
            mutation ($objInput: clCreatePerfilesInput!) {
              createPerfiles(objInput: $objInput) { perfilID }
            }
            """;

            var result = await GraphQLService.MutationAsync<PerfilIdMutationEnvelope>(mutation, new
            {
                objInput = new { perfil = "CONDOMINO", bAdministrador = false, bEliminado = false }
            });

            return result.CreatePerfiles?.PerfilID
                ?? throw new InvalidOperationException("No se pudo crear el perfil CONDOMINO.");
        }

        public async Task<IReadOnlyList<SgrPerfilFormViewModel>> GetSgrPerfilesAsync()
        {
            const string query = """
            query ($first: Int!) {
              getPerfiles(first: $first, where: { bEliminado: { eq: false } }) {
                edges {
                  node {
                    perfilID
                    perfil
                    bAdministrador
                    bEliminado
                  }
                }
              }
            }
            """;
            var response = await GraphQLService.QueryAsync<SgrPerfilesQueryEnvelope>(query, new { first = 100 });
            return (response.GetPerfiles?.Edges ?? Enumerable.Empty<GraphqlEdge<SgrPerfilRawNode>>())
                .Select(e => e.Node)
                .Where(n => n is not null)
                .Select(n => new SgrPerfilFormViewModel
                {
                    PerfilID       = n!.PerfilID,
                    Perfil         = n.Perfil       ?? string.Empty,
                    bAdministrador = n.bAdministrador ?? false,
                    bEliminado     = n.bEliminado    ?? false,
                })
                .ToList();
        }

        public async Task<bool> SaveSgrPerfilAsync(SgrPerfilFormViewModel model)
        {
            if (model.PerfilID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreatePerfilesInput!) {
                  createPerfiles(objInput: $objInput) { perfilID }
                }
                """;
                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new { perfil = model.Perfil, bAdministrador = model.bAdministrador, bEliminado = false }
                });
            }
            else
            {
                const string mutation = """
                mutation ($objInput: clUpdatePerfilesInput!) {
                  updatePerfiles(objInput: $objInput) { perfilID }
                }
                """;
                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new { perfilID = model.PerfilID, perfil = model.Perfil, bAdministrador = model.bAdministrador, bEliminado = model.bEliminado }
                });
            }
            return true;
        }

        public async Task<bool> DeleteSgrPerfilAsync(int perfilId)
        {
            const string mutation = """
            mutation ($objInput: clUpdatePerfilesInput!) {
              updatePerfiles(objInput: $objInput) { perfilID }
            }
            """;
            await GraphQLService.MutationAsync<object>(mutation, new
            {
                objInput = new { perfilID = perfilId, bEliminado = true }
            });
            return true;
        }

        // ─── Admin SGR — Permisos ─────────────────────────────────────────────

        public async Task<IReadOnlyList<SgrMenuViewModel>> GetSgrMenusAsync()
        {
            const string query = """
            query ($first: Int!) {
              getMenus(first: $first, where: { bEliminado: { eq: false } }) {
                edges {
                  node {
                    menuID
                    tituloMenu
                    padreMenuID
                    orden
                  }
                }
              }
            }
            """;
            var response = await GraphQLService.QueryAsync<SgrMenusQueryEnvelope>(query, new { first = 200 });
            return (response.GetMenus?.Edges ?? Enumerable.Empty<GraphqlEdge<SgrMenuRawNode>>())
                .Select(e => e.Node)
                .Where(n => n is not null)
                .Select(n => new SgrMenuViewModel
                {
                    MenuID     = n!.MenuID     ?? 0,
                    TituloMenu = n.TituloMenu  ?? string.Empty,
                    PadreMenuID = n.PadreMenuID,
                    Orden      = n.Orden       ?? 0,
                })
                .ToList();
        }

        public async Task<IReadOnlyList<PerfilPermisoMenuViewModel>> GetPerfilPermisosMenusAsync(int perfilId)
        {
            const string query = """
            query ($first: Int!, $perfilId: Int!) {
              getPerfilMenus(first: $first, where: { perfilID: { eq: $perfilId }, bEliminado: { eq: false } }) {
                edges {
                  node {
                    menuID
                    tituloMenu
                    padreMenuID
                    orden
                    bVisible
                  }
                }
              }
            }
            """;
            var response = await GraphQLService.QueryAsync<PerfilPermisosMenuQueryEnvelope>(query, new { first = 200, perfilId });
            return (response.GetPerfilMenus?.Edges ?? Enumerable.Empty<GraphqlEdge<PerfilPermisoMenuRawNode>>())
                .Select(e => e.Node)
                .Where(n => n is not null)
                .Select(n => new PerfilPermisoMenuViewModel
                {
                    MenuID      = n!.MenuID     ?? 0,
                    TituloMenu  = n.TituloMenu  ?? string.Empty,
                    PadreMenuID = n.PadreMenuID,
                    Orden       = n.Orden       ?? 0,
                    bVisible    = n.bVisible    ?? false,
                })
                .ToList();
        }

        public async Task<IReadOnlyList<PerfilPermisoBotonesViewModel>> GetPerfilPermisosBotonAsync(int perfilId)
        {
            const string query = """
            query ($first: Int!, $perfilId: Int!) {
              getPerfilMenuBotones(first: $first, where: { perfilID: { eq: $perfilId }, bEliminado: { eq: false } }) {
                edges {
                  node {
                    menuBotonID
                    menuID
                    boton
                    accion
                    bActivo
                  }
                }
              }
            }
            """;
            var response = await GraphQLService.QueryAsync<PerfilPermisosBotonQueryEnvelope>(query, new { first = 500, perfilId });
            return (response.GetPerfilMenuBotones?.Edges ?? Enumerable.Empty<GraphqlEdge<PerfilPermisoBotonRawNode>>())
                .Select(e => e.Node)
                .Where(n => n is not null)
                .Select(n => new PerfilPermisoBotonesViewModel
                {
                    MenuBotonID = n!.MenuBotonID ?? 0,
                    MenuID      = n.MenuID       ?? 0,
                    Boton       = n.Boton        ?? string.Empty,
                    Accion      = n.Accion       ?? string.Empty,
                    bActivo     = n.bActivo      ?? false,
                })
                .ToList();
        }

        public async Task<bool> SetPerfilMenuVisibleAsync(int perfilId, int menuId, bool bVisible)
        {
            const string query = """
            query ($first: Int!, $perfilId: Int!, $menuId: Int!) {
              getPerfilMenus(first: $first, where: { perfilID: { eq: $perfilId }, menuID: { eq: $menuId }, bEliminado: { eq: false } }) {
                edges { node { perfilMenuID } }
              }
            }
            """;
            var existing = await GraphQLService.QueryAsync<PerfilMenuIdEnvelope>(query, new { first = 1, perfilId, menuId });
            var id = existing.GetPerfilMenus?.Edges?.FirstOrDefault()?.Node?.PerfilMenuID;
            if (id.HasValue)
            {
                const string update = """
                mutation ($objInput: clUpdatePerfilMenusInput!) {
                  updatePerfilMenus(objInput: $objInput) { perfilMenuID }
                }
                """;
                await GraphQLService.MutationAsync<object>(update, new { objInput = new { perfilMenuID = id.Value, bVisible } });
            }
            else
            {
                const string create = """
                mutation ($objInput: clCreatePerfilMenusInput!) {
                  createPerfilMenus(objInput: $objInput) { perfilMenuID }
                }
                """;
                await GraphQLService.MutationAsync<object>(create, new { objInput = new { perfilID = perfilId, menuID = menuId, bVisible, bEliminado = false } });
            }
            return true;
        }

        public async Task<bool> SetPerfilMenuBotonActivoAsync(int perfilId, int menuBotonId, bool bActivo)
        {
            const string query = """
            query ($first: Int!, $perfilId: Int!, $menuBotonId: Int!) {
              getPerfilMenuBotones(first: $first, where: { perfilID: { eq: $perfilId }, menuBotonID: { eq: $menuBotonId }, bEliminado: { eq: false } }) {
                edges { node { perfilMenuBotonID } }
              }
            }
            """;
            var existing = await GraphQLService.QueryAsync<PerfilMenuBotonIdEnvelope>(query, new { first = 1, perfilId, menuBotonId });
            var id = existing.GetPerfilMenuBotones?.Edges?.FirstOrDefault()?.Node?.PerfilMenuBotonID;
            if (id.HasValue)
            {
                const string update = """
                mutation ($objInput: clUpdatePerfilMenuBotonesInput!) {
                  updatePerfilMenuBotones(objInput: $objInput) { perfilMenuBotonID }
                }
                """;
                await GraphQLService.MutationAsync<object>(update, new { objInput = new { perfilMenuBotonID = id.Value, bActivo } });
            }
            else
            {
                const string create = """
                mutation ($objInput: clCreatePerfilMenuBotonesInput!) {
                  createPerfilMenuBotones(objInput: $objInput) { perfilMenuBotonID }
                }
                """;
                await GraphQLService.MutationAsync<object>(create, new { objInput = new { perfilID = perfilId, menuBotonID = menuBotonId, bActivo, bEliminado = false } });
            }
            return true;
        }

        // ─── Admin SGR — Usuarios ─────────────────────────────────────────────

        public async Task<IReadOnlyList<SgrUsuarioFormViewModel>> GetSgrUsuariosAsync()
        {
            const string query = """
            query ($first: Int!) {
              getUsuarios(first: $first, where: { bEliminado: { eq: false } }) {
                edges {
                  node {
                    usuarioID
                    nombreUsuario
                    correoUsuario
                    perfilID
                    bActivoUsuario
                    telefonoUsuario
                    fotoUrlUsuario
                  }
                }
              }
            }
            """;
            var response = await GraphQLService.QueryAsync<SgrUsuariosQueryEnvelope>(query, new { first = 500 });
            return (response.GetUsuarios?.Edges ?? Enumerable.Empty<GraphqlEdge<SgrUsuarioRawNode>>())
                .Select(e => e.Node)
                .Where(n => n is not null)
                .Select(n => new SgrUsuarioFormViewModel
                {
                    UsuarioID = n!.UsuarioID,
                    Nombre    = n.NombreUsuario  ?? string.Empty,
                    Correo    = n.CorreoUsuario  ?? string.Empty,
                    PerfilID  = n.PerfilID,
                    bActivo   = n.bActivoUsuario ?? true,
                    Telefono  = n.TelefonoUsuario,
                    FotoUrl   = n.FotoUrlUsuario,
                })
                .ToList();
        }

        public async Task<bool> SaveSgrUsuarioAsync(SgrUsuarioFormViewModel model)
        {
            const string mutation = """
            mutation ($objInput: clUpdateUsuariosInput!) {
              updateUsuarios(objInput: $objInput) { usuarioID }
            }
            """;
            await GraphQLService.MutationAsync<object>(mutation, new
            {
                objInput = new
                {
                    usuarioID        = model.UsuarioID,
                    nombreUsuario    = model.Nombre,
                    correoUsuario    = model.Correo,
                    telefonoUsuario  = model.Telefono,
                    fotoUrlUsuario   = model.FotoUrl,
                    perfilID         = model.PerfilID,
                    bActivoUsuario   = model.bActivo,
                }
            });
            return true;
        }

        public async Task<bool> CheckEmailExistsAsync(string correo, int? excludeUsuarioId)
        {
            const string query = """
            query ($first: Int!, $correo: String!) {
              getUsuarios(first: $first, where: { correoUsuario: { eq: $correo }, bEliminado: { eq: false } }) {
                edges {
                  node { usuarioID }
                }
              }
            }
            """;
            var response = await GraphQLService.QueryAsync<SgrUsuariosQueryEnvelope>(query, new { first = 5, correo });
            return (response.GetUsuarios?.Edges ?? Enumerable.Empty<GraphqlEdge<SgrUsuarioRawNode>>())
                .Select(e => e.Node)
                .Where(n => n is not null)
                .Any(n => n!.UsuarioID != excludeUsuarioId);
        }

        // ─── Admin SGR — Menus ────────────────────────────────────────────────

        public async Task<IReadOnlyList<SgrMenuAdminViewModel>> GetSgrMenusAdminAsync()
        {
            const string query = """
            query ($first: Int!) {
              getMenus(first: $first, where: { bEliminado: { eq: false } }) {
                edges {
                  node {
                    menuID
                    tituloMenu
                    ruta
                    icono
                    orden
                    padreMenuID
                    bEliminado
                  }
                }
              }
            }
            """;
            var response = await GraphQLService.QueryAsync<SgrMenusAdminQueryEnvelope>(query, new { first = 200 });
            return (response.GetMenus?.Edges ?? Enumerable.Empty<GraphqlEdge<SgrMenuAdminRawNode>>())
                .Select(e => e.Node)
                .Where(n => n is not null)
                .Select(n => new SgrMenuAdminViewModel
                {
                    MenuID      = n!.MenuID,
                    TituloMenu  = n.TituloMenu  ?? string.Empty,
                    Ruta        = n.Ruta,
                    Icono       = n.Icono,
                    Orden       = n.Orden       ?? 0,
                    PadreMenuID = n.PadreMenuID,
                    bEliminado  = n.bEliminado  ?? false,
                })
                .OrderBy(m => m.PadreMenuID.HasValue ? 1 : 0)
                .ThenBy(m => m.Orden)
                .ToList();
        }

        public async Task<bool> SaveSgrMenuAsync(SgrMenuAdminViewModel model)
        {
            if (model.MenuID is null or 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateMenusInput!) {
                  createMenus(objInput: $objInput) { menuID }
                }
                """;
                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        tituloMenu  = model.TituloMenu,
                        ruta        = model.Ruta,
                        icono       = model.Icono ?? "mdi-circle-small",
                        orden       = model.Orden,
                        padreMenuID = model.PadreMenuID,
                        bEliminado  = false
                    }
                });
            }
            else
            {
                const string mutation = """
                mutation ($objInput: clUpdateMenusInput!) {
                  updateMenus(objInput: $objInput) { menuID }
                }
                """;
                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        menuID      = model.MenuID,
                        tituloMenu  = model.TituloMenu,
                        ruta        = model.Ruta,
                        icono       = model.Icono,
                        orden       = (int?)model.Orden,
                        padreMenuID = model.PadreMenuID,
                        bEliminado  = (bool?)model.bEliminado
                    }
                });
            }
            return true;
        }

        public async Task<bool> DeleteSgrMenuAsync(int menuId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteMenus(nMenusID: $id)
            }
            """;
            await GraphQLService.MutationAsync<object>(mutation, new { id = menuId });
            return true;
        }

        // ─── Admin — Residentes ───────────────────────────────────────────────
        private async Task<Dictionary<int, IReadOnlyList<CasaFormViewModel>>> GetCasasActivasPorUsuarioAsync()
        {
            const string casasQuery = """
            query ($first: Int!) {
              getCasas(first: $first, where: { bEliminado: { eq: false } }) {
                edges {
                  node {
                    casaID
                    condominioID
                    nombreCondominio
                    direccionCasa
                    numeroExtCasa
                    propietarioUsuarioID
                    bEliminado
                  }
                }
              }
            }
            """;

            var casasResponse = await GraphQLService.QueryAsync<CasasQueryEnvelope>(casasQuery, new { first = 100 });
            var casas = ExtractNodes(casasResponse.GetCasas ?? new GraphqlConnection<CasaFormViewModel>());

            return casas
                .Where(c => c.PropietarioUsuarioID.HasValue)
                .GroupBy(c => c.PropietarioUsuarioID!.Value)
                .ToDictionary(g => g.Key, g => (IReadOnlyList<CasaFormViewModel>)g.ToList());
        }

        private static string BuildDireccionCondomino(IEnumerable<CasaFormViewModel> casas)
        {
            return string.Join(", ",
                casas
              .Select(c => c.NumeroExtCasa?.Trim() ?? string.Empty)
                    .Where(value => !string.IsNullOrWhiteSpace(value))
                    .Distinct());
        }

        public async Task<IReadOnlyList<ResidenteAdminViewModel>> GetResidentesAsync()
        {
            // Get usuarios perfil condómino (perfilID = 3)
            const string usuariosQuery = """
            query ($first: Int!) {
              getUsuarios(first: $first, where: { perfilID: { eq: 3 }, bEliminado: { eq: false } }) {
                edges {
                  node {
                    usuarioID
                    nombreUsuario
                    correoUsuario
                    bActivoUsuario
                    bEliminado
                  }
                }
              }
            }
            """;
            var usuariosTask = GraphQLService.QueryAsync<UsuariosQueryEnvelope>(usuariosQuery, new { first = 50 });
            var casasTask = GetCasasActivasPorUsuarioAsync();

            await Task.WhenAll(usuariosTask, casasTask);

            var usuariosResponse = await usuariosTask;
            var usuarios = ExtractNodes(usuariosResponse.GetUsuarios ?? new GraphqlConnection<UsuarioLookupViewModel>());
            var casasByUsuario = await casasTask;

            return usuarios.Select(u => new ResidenteAdminViewModel
            {
                UsuarioID = u.UsuarioID,
                Nombre = u.NombreUsuario ?? string.Empty,
                Correo = u.CorreoUsuario ?? string.Empty,
                DireccionCondomino = u.UsuarioID.HasValue && casasByUsuario.TryGetValue(u.UsuarioID.Value, out var userCasas)
                    ? BuildDireccionCondomino(userCasas)
                    : string.Empty,
                bActivo = u.bActivoUsuario ?? false,
                Casas = u.UsuarioID.HasValue && casasByUsuario.TryGetValue(u.UsuarioID.Value, out userCasas)
                    ? userCasas.Select(c => new CasaAdminViewModel
                    {
                        CasaID = c.CasaID,
                        CondominioID = c.CondominioID,
                        NombreCondominio = c.NombreCondominio ?? string.Empty,
                        DireccionCasa = c.DireccionCasa ?? string.Empty,
                        NumeroExtCasa = c.NumeroExtCasa ?? string.Empty,
                        PropietarioUsuarioID = c.PropietarioUsuarioID,
                        bEliminado = c.bEliminado
                    }).ToList()
                    : Array.Empty<CasaAdminViewModel>()
            }).ToList();
        }

        public async Task<bool> SaveResidenteAsync(ResidenteAdminFormViewModel model)
        {
            // For now, only update usuario. Casa editing can be added later if needed.
            const string mutation = """
            mutation ($objInput: clUpdateUsuariosInput!) {
              updateUsuarios(objInput: $objInput) {
                usuarioID
              }
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new
            {
                objInput = new
                {
                    usuarioID = model.UsuarioID,
                    nombreUsuario = model.Nombre,
                    correoUsuario = model.Correo,
                    bActivoUsuario = model.bActivo
                }
            });

            return true;
        }

        public async Task<bool> DeleteResidenteAsync(int usuarioId)
        {
            const string mutation = """
            mutation ($id: Int!) {
              deleteUsuarios(nUsuariosID: $id)
            }
            """;

            await GraphQLService.MutationAsync<object>(mutation, new { id = usuarioId });
            return true;
        }

        // ─── Admin — Mascotas ──────────────────────────────────────────────────
        public async Task<IReadOnlyList<MascotaAdminViewModel>> GetMascotasAdminAsync()
        {
            const string query = """
            query ($first: Int!) {
              getMascotas(first: $first, where: { bEliminado: { eq: false } }) {
                edges {
                  node {
                    mascotaID
                    usuarioID
                    nombreMascota
                    razaLibre
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<MascotasQueryEnvelope>(query, new { first = 100 });
            var mascotas = ExtractNodes(response.GetMascotas ?? new GraphqlConnection<MascotaNode>());

            var usuariosTask = GetUsuariosAsync();
            var casasTask = GetCasasActivasPorUsuarioAsync();

            await Task.WhenAll(usuariosTask, casasTask);

            var usuarios = await usuariosTask;
            var casasByUsuario = await casasTask;
            var usuariosDict = usuarios
              .Where(u => u.UsuarioID.HasValue)
              .ToDictionary(u => u.UsuarioID!.Value, u => u.NombreUsuario);

            return mascotas.Select(m => new MascotaAdminViewModel
            {
                MascotaID = m.MascotaID,
                UsuarioID = m.UsuarioID,
              NombreUsuario = m.UsuarioID.HasValue && usuariosDict.TryGetValue(m.UsuarioID.Value, out var nombre)
                ? nombre ?? "Desconocido"
                : "Desconocido",
              DireccionCondomino = m.UsuarioID.HasValue && casasByUsuario.TryGetValue(m.UsuarioID.Value, out var casasUsuario)
                ? BuildDireccionCondomino(casasUsuario)
                : string.Empty,
                NombreMascota = m.NombreMascota ?? string.Empty,
                RazaLibre = m.RazaLibre ?? string.Empty,
                bEliminado = m.bEliminado ?? false
            }).ToList();
        }

        public async Task<bool> SaveMascotaAdminAsync(MascotaAdminFormViewModel model)
        {
            if (model.MascotaID == null || model.MascotaID == 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateMascotasInput!) {
                  createMascotas(objInput: $objInput) {
                    mascotaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        usuarioID = model.UsuarioID,
                        nombreMascota = model.NombreMascota,
                        razaLibre = model.RazaLibre,
                        bEliminado = false
                    }
                });
            }
            else
            {
                const string mutation = """
                mutation ($objInput: clUpdateMascotasInput!) {
                  updateMascotas(objInput: $objInput) {
                    mascotaID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        mascotaID = model.MascotaID,
                        nombreMascota = model.NombreMascota,
                        razaLibre = model.RazaLibre
                    }
                });
            }

            return true;
        }

        // ─── Admin — Automóviles ───────────────────────────────────────────────
        public async Task<IReadOnlyList<AutomovilAdminViewModel>> GetAutomovilesAdminAsync()
        {
            const string query = """
            query ($first: Int!) {
              getAutomoviles(first: $first, where: { bEliminado: { eq: false } }) {
                edges {
                  node {
                    automovilID
                    usuarioID
                    modeloLibre
                    placas
                    bEliminado
                  }
                }
              }
            }
            """;

            var response = await GraphQLService.QueryAsync<AutomovilesQueryEnvelope>(query, new { first = 100 });
            var automoviles = ExtractNodes(response.GetAutomoviles ?? new GraphqlConnection<AutomovilNode>());

            var usuariosTask = GetUsuariosAsync();
            var casasTask = GetCasasActivasPorUsuarioAsync();

            await Task.WhenAll(usuariosTask, casasTask);

            var usuarios = await usuariosTask;
            var casasByUsuario = await casasTask;
            var usuariosDict = usuarios
              .Where(u => u.UsuarioID.HasValue)
              .ToDictionary(u => u.UsuarioID!.Value, u => u.NombreUsuario);

            return automoviles.Select(a => new AutomovilAdminViewModel
            {
                AutomovilID = a.AutomovilID,
                UsuarioID = a.UsuarioID,
              NombreUsuario = a.UsuarioID.HasValue && usuariosDict.TryGetValue(a.UsuarioID.Value, out var nombre)
                ? nombre ?? "Desconocido"
                : "Desconocido",
              DireccionCondomino = a.UsuarioID.HasValue && casasByUsuario.TryGetValue(a.UsuarioID.Value, out var casasUsuario)
                ? BuildDireccionCondomino(casasUsuario)
                : string.Empty,
                ModeloLibre = a.ModeloLibre ?? string.Empty,
                Placas = a.Placas ?? string.Empty,
                bEliminado = a.bEliminado ?? false
            }).ToList();
        }

        public async Task<bool> SaveAutomovilAdminAsync(AutomovilAdminFormViewModel model)
        {
            if (model.AutomovilID == null || model.AutomovilID == 0)
            {
                const string mutation = """
                mutation ($objInput: clCreateAutomovilesInput!) {
                  createAutomoviles(objInput: $objInput) {
                    automovilID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        usuarioID = model.UsuarioID,
                        modeloLibre = model.ModeloLibre,
                        placas = model.Placas,
                        color = string.Empty,
                        bEliminado = false
                    }
                });
            }
            else
            {
                const string mutation = """
                mutation ($objInput: clUpdateAutomovilesInput!) {
                  updateAutomoviles(objInput: $objInput) {
                    automovilID
                  }
                }
                """;

                await GraphQLService.MutationAsync<object>(mutation, new
                {
                    objInput = new
                    {
                        automovilID = model.AutomovilID,
                        modeloLibre = model.ModeloLibre,
                        placas = model.Placas,
                        color = string.Empty
                    }
                });
            }

            return true;
        }

        // ─── Admin SGR — Private raw nodes/envelopes ──────────────────────────

        private sealed class SgrPerfilesQueryEnvelope
        {
            public GraphqlConnection<SgrPerfilRawNode>? GetPerfiles { get; set; }
        }

        private sealed class SgrPerfilRawNode
        {
            public int?    PerfilID       { get; set; }
            public string? Perfil         { get; set; }
            public bool?   bAdministrador { get; set; }
            public bool?   bEliminado     { get; set; }
        }

        private sealed class SgrMenusQueryEnvelope
        {
            public GraphqlConnection<SgrMenuRawNode>? GetMenus { get; set; }
        }

        private sealed class SgrMenuRawNode
        {
            public int?    MenuID      { get; set; }
            public string? TituloMenu  { get; set; }
            public int?    PadreMenuID { get; set; }
            public int?    Orden       { get; set; }
        }

        private sealed class SgrMenusAdminQueryEnvelope
        {
            public GraphqlConnection<SgrMenuAdminRawNode>? GetMenus { get; set; }
        }

        private sealed class SgrMenuAdminRawNode
        {
            public int?    MenuID      { get; set; }
            public string? TituloMenu  { get; set; }
            public string? Ruta        { get; set; }
            public string? Icono       { get; set; }
            public int?    Orden       { get; set; }
            public int?    PadreMenuID { get; set; }
            public bool?   bEliminado  { get; set; }
        }

        private sealed class PerfilPermisosMenuQueryEnvelope
        {
            public GraphqlConnection<PerfilPermisoMenuRawNode>? GetPerfilMenus { get; set; }
        }

        private sealed class PerfilPermisoMenuRawNode
        {
            public int?    MenuID      { get; set; }
            public string? TituloMenu  { get; set; }
            public int?    PadreMenuID { get; set; }
            public int?    Orden       { get; set; }
            public bool?   bVisible    { get; set; }
        }

        private sealed class PerfilPermisosBotonQueryEnvelope
        {
            public GraphqlConnection<PerfilPermisoBotonRawNode>? GetPerfilMenuBotones { get; set; }
        }

        private sealed class PerfilPermisoBotonRawNode
        {
            public int?    MenuBotonID { get; set; }
            public int?    MenuID      { get; set; }
            public string? Boton       { get; set; }
            public string? Accion      { get; set; }
            public bool?   bActivo     { get; set; }
        }

        private sealed class PerfilMenuIdEnvelope
        {
            public GraphqlConnection<PerfilMenuIdNode>? GetPerfilMenus { get; set; }
        }

        private sealed class PerfilMenuIdNode
        {
            public int? PerfilMenuID { get; set; }
        }

        private sealed class PerfilMenuBotonIdEnvelope
        {
            public GraphqlConnection<PerfilMenuBotonIdNode>? GetPerfilMenuBotones { get; set; }
        }

        private sealed class PerfilMenuBotonIdNode
        {
            public int? PerfilMenuBotonID { get; set; }
        }

        private sealed class SgrUsuariosQueryEnvelope
        {
            public GraphqlConnection<SgrUsuarioRawNode>? GetUsuarios { get; set; }
        }

        private sealed class SgrUsuarioRawNode
        {
            public int?    UsuarioID        { get; set; }
            public string? NombreUsuario    { get; set; }
            public string? CorreoUsuario    { get; set; }
            public int?    PerfilID         { get; set; }
            public bool?   bActivoUsuario   { get; set; }
            public string? TelefonoUsuario  { get; set; }
            public string? FotoUrlUsuario   { get; set; }
        }
    }
}