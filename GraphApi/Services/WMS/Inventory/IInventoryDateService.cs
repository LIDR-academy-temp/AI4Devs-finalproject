
using GraphApi.Models.WMS.Inventory;

namespace GraphApi.Services.WMS.Inventory
{
    /// <summary>
    /// Define las operaciones del Reporte de Inventario
    /// </summary>
    public interface IInventoryDateService
    {
        /// <summary>
        /// Reporte de Inventario a la fecha
        /// </summary>
        /// <param name="objInput">Datos para el filtro.</param>
        /// <param name="userId">ID de usuario (cabecera “UserID”).</param>
        /// <param name="windowName">Nombre de aplicación (cabecera “WindowName”).</param>
        Task<IEnumerable<clReadInventoryDate>> GetInventoryDate(
      clFilterInventoryDate objInput,
      int userId,
      string windowName);
    }
}
