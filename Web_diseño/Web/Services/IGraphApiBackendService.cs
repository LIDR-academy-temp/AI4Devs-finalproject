using Web.Models.Admin;
using Web.Models.Residente;

namespace Web.Services
{
    public interface IGraphApiBackendService
    {
        Task<(string Token, DateTime Expires)> AuthenticateAsync(string username, string password);
        Task<IReadOnlyList<CondominioFormViewModel>> GetCondominiosAsync();
        Task<IReadOnlyList<UsuarioLookupViewModel>> GetUsuariosAsync();
        Task<IReadOnlyList<TipoIdentificacionLookupViewModel>> GetTipoIdentificacionesAsync();
        Task<IReadOnlyList<TicketBoardItemViewModel>> GetTicketsAsync();
        Task<IReadOnlyList<TicketBoardStateLookupViewModel>> GetEstadosTicketsAsync();
        Task<IReadOnlyList<TicketBoardPriorityLookupViewModel>> GetPrioridadTicketsAsync();
        Task<IReadOnlyList<TicketBoardCommentViewModel>> GetComentariosTicketsAsync();
        Task<IReadOnlyList<TicketBoardAssignmentViewModel>> GetTicketsUsuariosAsignadosAsync();
        Task<IReadOnlyList<TicketBoardAttachmentViewModel>> GetTicketAttachmentsAsync();
        Task<int?> SaveTicketAsync(TicketBoardItemViewModel model);
        Task<bool> DeleteTicketAsync(int ticketId);
        Task<bool> SaveTicketCommentAsync(TicketBoardReplyViewModel model);
        Task<bool> SaveTicketAssignmentAsync(TicketBoardAssignmentFormViewModel model);
        Task<int?> SaveArchivoAsync(string nombre, string ruta, int? tipoArchivoID, bool esPrivado, bool bEliminado);
        Task<int?> SaveTicketDocumentoAsync(int ticketId, int documentoId, bool bEliminado);
        Task<bool> DeleteArchivoAsync(int archivoId);
        Task<bool> SaveCondominioAsync(CondominioFormViewModel model);
        Task<bool> DeleteCondominioAsync(int condominioId);
        Task<IReadOnlyList<CasaFormViewModel>> GetCasasAsync();
        Task<bool> SaveCasaAsync(CasaFormViewModel model);
        Task<bool> DeleteCasaAsync(int casaId);
        Task<IReadOnlyList<VisitaFormViewModel>> GetVisitasAsync();
        Task<bool> SaveVisitaAsync(VisitaFormViewModel model);
        Task<bool> DeleteVisitaAsync(int visitaId);
        Task<IReadOnlyList<PaseQrFormViewModel>> GetPasesQrAsync();
        Task<PaseQrFormViewModel?> GetPaseQrByCodeAsync(string codigoQr);
        Task<bool> SavePaseQrAsync(PaseQrFormViewModel model);
        Task<bool> DeletePaseQrAsync(int paseQrId);
        Task<IReadOnlyList<ReservaAmenidadFormViewModel>> GetReservasAmenidadesAsync();
        Task<IReadOnlyList<ReservacionEstadoLookupViewModel>> GetReservacionEstadosAsync();
        Task<bool> SaveReservaAmenidadAsync(ReservaAmenidadFormViewModel model);
        Task<bool> DeleteReservaAmenidadAsync(int reservacionAreaId);
        Task<IReadOnlyList<AreaComunFormViewModel>> GetAreasComunesAsync();
        Task<bool> SaveAreaComunAsync(AreaComunFormViewModel model);
        Task<bool> DeleteAreaComunAsync(int areaComunId);

        // Finanzas — Cuentas
        Task<IReadOnlyList<CuentaFormViewModel>> GetCuentasAsync();
        Task<bool> SaveCuentaAsync(CuentaFormViewModel model);
        Task<bool> DeleteCuentaAsync(int cuentaId);

        // Finanzas — TiposMovimiento
        Task<IReadOnlyList<TipoMovimientoLookupViewModel>> GetTiposMovimientoAsync();

        // Finanzas — Cuotas
        Task<IReadOnlyList<CuotaFormViewModel>> GetCuotasAsync();
        Task<bool> SaveCuotaAsync(CuotaFormViewModel model);
        Task<bool> DeleteCuotaAsync(int cuotaId);

        // Finanzas — Transacciones
        Task<IReadOnlyList<TransaccionFormViewModel>> GetTransaccionesAsync();
        Task<bool> SaveTransaccionAsync(TransaccionFormViewModel model);
        Task<bool> DeleteTransaccionAsync(int transaccionId);

        // Juntas
        Task<IReadOnlyList<JuntaFormViewModel>> GetJuntasAsync();
        Task<bool> SaveJuntaAsync(JuntaFormViewModel model);
        Task<bool> DeleteJuntaAsync(int juntaId);

        // Documentos / Archivos
        Task<IReadOnlyList<ArchivoFormViewModel>> GetAllArchivosAsync();
        Task<bool> SaveDocumentoAsync(ArchivoFormViewModel model);

        // Notificaciones Grupales
        Task<IReadOnlyList<NotificacionFormViewModel>> GetNotificacionesAsync();
        Task<bool> SaveNotificacionAsync(NotificacionFormViewModel model);
        Task<bool> DeleteNotificacionAsync(int notificacionId);

        // Perfil
        Task<PerfilViewModel?> GetPerfilByCorreoAsync(string correo);
        Task<bool> UpdatePerfilAsync(int usuarioId, string nombre, string? telefono, string? fotoUrl, string? correo = null);
        Task<bool> CambiarPasswordAsync(int usuarioId, string passwordNuevo);
        Task<bool> CheckEmailExistsAsync(string correo, int? excludeUsuarioId);
        Task<int> CreateUsuarioCondominoAsync(string correo, string nombre, string password, int perfilId);

        // Residente — Mascotas y Automoviles
        Task<IReadOnlyList<MascotaFormViewModel>> GetMascotasByUsuarioAsync(int usuarioId);
        Task<bool> SaveMascotaAsync(MascotaFormViewModel model);
        Task<bool> DeleteMascotaAsync(int mascotaId);

        Task<IReadOnlyList<AutomovilFormViewModel>> GetAutomovilesByUsuarioAsync(int usuarioId);
        Task<bool> SaveAutomovilAsync(AutomovilFormViewModel model);
        Task<bool> DeleteAutomovilAsync(int automovilId);

        // Encuestas — Admin
        Task<IReadOnlyList<EncuestaFormViewModel>> GetEncuestasAsync();
        Task<bool> SaveEncuestaAsync(EncuestaFormViewModel model);
        Task<bool> DeleteEncuestaAsync(int encuestaId);
        Task<IReadOnlyList<PreguntaFormViewModel>> GetPreguntasAsync(int encuestaId);
        Task<bool> SavePreguntaAsync(PreguntaFormViewModel model);
        Task<bool> DeletePreguntaAsync(int preguntaId);
        Task<IReadOnlyList<OpcionPreguntaFormViewModel>> GetOpcionesAsync(int encuestaId);
        Task<bool> SaveOpcionAsync(OpcionPreguntaFormViewModel model);
        Task<bool> DeleteOpcionAsync(int opcionId);

        // Encuestas — Residente
        Task<bool> EncuestaYaRespondidaAsync(int encuestaId, int usuarioId);
        Task SaveRespuestasEncuestaAsync(int encuestaId, int usuarioId, IReadOnlyList<RespuestaEncuestaItemViewModel> respuestas);

        // Encuestas — Resultados
        Task<ResultadosEncuestaViewModel> GetResultadosEncuestaAsync(int encuestaId);

        // Dashboard
        Task<DashboardViewModel> GetDashboardSummaryAsync();

        // Permisos
        Task<IReadOnlyList<PerfilMenuItemViewModel>> GetPerfilMenusAsync(int perfilId);
        Task<IReadOnlyList<PerfilMenuBotonItemViewModel>> GetPerfilMenuBotonAsync(int perfilId);

        // Admin SGR — Perfiles
        Task<IReadOnlyList<SgrPerfilFormViewModel>> GetSgrPerfilesAsync();
        Task<bool> SaveSgrPerfilAsync(SgrPerfilFormViewModel model);
        Task<bool> DeleteSgrPerfilAsync(int perfilId);
        Task<int> EnsurePerfilCondominoAsync();

        // Admin SGR — Permisos (menus + botones para un perfil)
        Task<IReadOnlyList<PerfilPermisoMenuViewModel>> GetPerfilPermisosMenusAsync(int perfilId);
        Task<IReadOnlyList<PerfilPermisoBotonesViewModel>> GetPerfilPermisosBotonAsync(int perfilId);
        Task<IReadOnlyList<SgrMenuViewModel>> GetSgrMenusAsync();
        Task<bool> SetPerfilMenuVisibleAsync(int perfilId, int menuId, bool bVisible);
        Task<bool> SetPerfilMenuBotonActivoAsync(int perfilId, int menuBotonId, bool bActivo);

        // Admin SGR — Usuarios
        Task<IReadOnlyList<SgrUsuarioFormViewModel>> GetSgrUsuariosAsync();
        Task<bool> SaveSgrUsuarioAsync(SgrUsuarioFormViewModel model);

        // Admin SGR — Menus
        Task<IReadOnlyList<SgrMenuAdminViewModel>> GetSgrMenusAdminAsync();
        Task<bool> SaveSgrMenuAsync(SgrMenuAdminViewModel model);
        Task<bool> DeleteSgrMenuAsync(int menuId);

        // Admin — Residentes (usuarios perfil condomino + casas)
        Task<IReadOnlyList<ResidenteAdminViewModel>> GetResidentesAsync();
        Task<bool> SaveResidenteAsync(ResidenteAdminFormViewModel model);
        Task<bool> DeleteResidenteAsync(int usuarioId);

        // Admin — Mascotas de residentes
        Task<IReadOnlyList<MascotaAdminViewModel>> GetMascotasAdminAsync();
        Task<bool> SaveMascotaAdminAsync(MascotaAdminFormViewModel model);

        // Admin — Automoviles de residentes
        Task<IReadOnlyList<AutomovilAdminViewModel>> GetAutomovilesAdminAsync();
        Task<bool> SaveAutomovilAdminAsync(AutomovilAdminFormViewModel model);
    }
}