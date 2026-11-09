using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.WMS.Inventory
{

        [SwaggerSchema("Modelo de Filtros Reporte Intentario")]
        [GraphQLDescription("Modelo de Filtros Reporte Intentario")]
        public class clFilterInventoryDate
    {
            [SwaggerSchema("Fecha de Inventario")]
            [GraphQLNonNullType]
            [GraphQLDescription("Fecha de Inventario.")]
            public string InventoryDate { get; set; } = default!;

    
        }


        [SwaggerSchema("Modelo de lectura Reporte Intentario")]
        [GraphQLDescription("Modelo de lectura Reporte Intentario")]
        public class clReadInventoryDate
        {
          

            [SwaggerSchema("Identificador único del CEDIS")]
            [GraphQLNonNullType]
            [GraphQLDescription("Identificador único del CEDIS.")]
            public int WarehouseID { get; set; }

            [SwaggerSchema("CEDIS")]
            [GraphQLNonNullType]
            [GraphQLDescription("CEDIS.")]
            public string Warehouse { get; set; } = default!;

            [SwaggerSchema("Identificador único del Articulo")]
            [GraphQLNonNullType]
            [GraphQLDescription("Identificador único del DefectType.")]
            public int ItemID { get; set; }

            [SwaggerSchema("IDLIOR")]
            [GraphQLNonNullType]
            [GraphQLDescription("IDLIOR")]
            public string ItemCode { get; set; } = default!;

            [SwaggerSchema("IDNICE")]
            [GraphQLNonNullType]
            [GraphQLDescription("IDNICE.")]
            public string ItemSecondCode { get; set; } = default!;

            [SwaggerSchema("Descripcion del artículo")]
            [GraphQLNonNullType]
            [GraphQLDescription("Descripcion del artículo.")]
            public string ItemDescription { get; set; } = default!;

            [SwaggerSchema("Identificador único del catálogo")]
            [GraphQLNonNullType]
            [GraphQLDescription("Identificador único del catálogo.")]
            public int CatalogID { get; set; }

            [SwaggerSchema("Catálogo")]
            [GraphQLNonNullType]
            [GraphQLDescription("Catálogo.")]
            public string Catalog { get; set; } = default!;

            [SwaggerSchema("Identificador único de la Familia")]
            [GraphQLNonNullType]
            [GraphQLDescription("Identificador único de la Familia.")]
            public int FamilyID { get; set; }

            [SwaggerSchema("Familia")]
            [GraphQLNonNullType]
            [GraphQLDescription("Familia.")]
            public string Family { get; set; } = default!;

            [SwaggerSchema("Identificador único de la SubFamilia")]
            [GraphQLNonNullType]
            [GraphQLDescription("\"Identificador único de la SubFamilia.")]
            public int SubFamilyID { get; set; }

            [SwaggerSchema("SubFamilia")]
            [GraphQLNonNullType]
            [GraphQLDescription("SubFamilia.")]
            public string SubFamily { get; set; } = default!;

            [SwaggerSchema("Inventario Total")]
            [GraphQLNonNullType]
            [GraphQLDescription("Inventario Total.")]
            public int Available { get; set; }

            [SwaggerSchema("Entrada a inventario")]
            [GraphQLNonNullType]
            [GraphQLDescription("Entrada a inventario.")]
            public int Entry { get; set; }

            [SwaggerSchema("Salida de inventario")]
            [GraphQLNonNullType]
            [GraphQLDescription("Salida de inventario.")]
            public int Output { get; set; }

            [SwaggerSchema("Transferencias Pendientes")]
            [GraphQLNonNullType]
            [GraphQLDescription("Transferencias Pendientes.")]
            public int TransferPending { get; set; }

            [SwaggerSchema("Inventario a la fecha")]
            [GraphQLNonNullType]
            [GraphQLDescription("Inventario a la fecha.")]
            public int InventoryDate { get; set; }

            [SwaggerSchema("Identificardor origen")]
            [GraphQLNonNullType]
            [GraphQLDescription("Identificardor origen.")]
            public int Origin { get; set; }

            [SwaggerSchema("Fecha de Inventario")]
            [GraphQLNonNullType]
            [GraphQLDescription("Fecha de Inventario.")]
            public DateTime Date { get; set; }

            [SwaggerSchema("Precio Catálogo")]
            [GraphQLNonNullType]
            [GraphQLDescription("Precio Catálogo.")]
            public decimal Price { get; set; }

            [SwaggerSchema("Código del CEDIS")]
            [GraphQLNonNullType]
            [GraphQLDescription("Código del CEDIS.")]
            public string WarehouseCode { get; set; } = default!;

            [SwaggerSchema("Stock JDE")]
            [GraphQLNonNullType]
            [GraphQLDescription("Stock JDE.")]
            public string Stock { get; set; } = default!;

            [SwaggerSchema("Familia JDE")]
            [GraphQLDescription("Familia JDE\".")]
            [GraphQLNonNullType]
            public string? famJD { get; set; } = string.Empty;

            [SwaggerSchema("SubFamilia JDE")]
            [GraphQLDescription("SubFamilia JDE.")]
            public string? SubfamJD { get; set; } = string.Empty;


    }


    
}

