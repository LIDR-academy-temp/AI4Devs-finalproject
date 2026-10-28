namespace GraphApi.Infrastructure.Services
{
    /// <summary>
    /// Encapsula la lectura de los headers HTTP comunes (UserID, WindowName)
    /// usados por todos los resolvers GraphQL. Reemplaza el boilerplate de ~15 líneas
    /// por una sola llamada: var (userId, window) = _ctx.GetRequestContext();
    /// </summary>
    public interface IGraphQLContextService
    {
        /// <summary>
        /// Lee UserID y WindowName de los headers HTTP del request actual.
        /// Lanza GraphQLException si UserID falta o no es entero.
        /// </summary>
        (int UserId, string WindowName) GetRequestContext();
    }
}
