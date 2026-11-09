using Dapper;
using GraphApi.Models.WMS.Inventory;
using System.Data;


namespace GraphApi.Services.WMS.Inventory
{
    public class InventoryDateService : IInventoryDateService
    {
      
        private readonly IDbConnection _objDbDefault;
        private readonly IConfiguration _objConfig;

        public InventoryDateService(IDbConnection objDbDefault, IConfiguration objConfig)
        {
            _objDbDefault = objDbDefault;
            _objConfig = objConfig;
        }

        public async Task<IEnumerable<clReadInventoryDate>> GetInventoryDate(
       clFilterInventoryDate objInput,
       int userId,
       string windowName)
        {
          
           
            string sSelectSql = @"
            --WindowName:{windowName},UserID:{userId} 
           EXEC WMS.prcGetInventoryDate  @InventoryDate ";

            var vReadParams = new { InventoryDate = objInput.InventoryDate };

            var vCreated = await _objDbDefault.QueryAsync<clReadInventoryDate>(sSelectSql, vReadParams);

            if (vCreated is null)
            {
                throw new InvalidOperationException(
                    $"No se pudo recuperar acceder al reporte.");
            }

            return vCreated;
        }

    }
}
