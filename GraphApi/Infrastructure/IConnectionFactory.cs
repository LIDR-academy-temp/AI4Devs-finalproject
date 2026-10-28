using System.Data;

namespace GraphApi.Infrastructure
{
    public interface IConnectionFactory
    {
        IDbConnection Create(string sKey);

        /// <summary>
        /// Invalida la entrada en cache de conexiones DB para la clave indicada.
        /// Llamar despues de crear, actualizar o eliminar una conexion dinamica.
        /// </summary>
        void InvalidateCache(string sKey);
    }
}
