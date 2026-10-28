using HotChocolate.Authorization;
using GraphApi.Infrastructure.Services;using GraphApi.Models.FNZ.DocumentosTransaccion;using GraphApi.Services.FNZ.DocumentosTransaccion;using HotChocolate;namespace GraphApi.GraphQL.FNZ.DocumentosTransaccion{    [QueryType]    [GraphQLDescription("Punto de entrada para las consultas de DocumentosTransaccions.")]    public class DocumentosTransaccionQuery    {        /// <summary>        /// Devuelve documentostransaccions con paginación, filtrado y ordenamiento.        /// </summary>        [UsePaging, UseFiltering, UseSorting, Authorize]        [GraphQLName("getDocumentosTransaccions")]        [GraphQLDescription("Obtiene una lista paginada, filtrada y ordenada de DocumentosTransaccions.")]        public Task<IEnumerable<clReadDocumentosTransaccion>> GetDocumentosTransaccionsAsync(            [Service] IGraphQLContextService objCtx,
            [Service] IDocumentosTransaccionService objService)
        {
            var (userId, windowName) = objCtx.GetRequestContext();
            return objService.GetDocumentosTransaccions(userId, windowName);
        }    }}