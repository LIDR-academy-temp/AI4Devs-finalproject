using System.Data;

namespace GraphApi.Infrastructure
{
    /// <summary>
    /// Unidad de trabajo: agrupa Connection + Transaction para operaciones
    /// multi-tabla (ej: TKT, JNT, FNZ) que requieren atomicidad.
    /// </summary>
    public interface IUnitOfWork : IDisposable
    {
        IDbConnection Connection { get; }
        IDbTransaction BeginTransaction();
        void Commit();
        void Rollback();
    }
}
