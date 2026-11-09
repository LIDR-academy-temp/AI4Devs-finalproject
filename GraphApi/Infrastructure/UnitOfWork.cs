using System.Data;

namespace GraphApi.Infrastructure
{
    /// <inheritdoc />
    public sealed class UnitOfWork : IUnitOfWork
    {
        private IDbTransaction? _transaction;
        private bool _disposed;

        public IDbConnection Connection { get; }

        public UnitOfWork(IDbConnection connection)
        {
            Connection = connection;
            if (connection.State != ConnectionState.Open)
                connection.Open();
        }

        public IDbTransaction BeginTransaction()
        {
            _transaction = Connection.BeginTransaction();
            return _transaction;
        }

        public void Commit()
        {
            _transaction?.Commit();
            _transaction?.Dispose();
            _transaction = null;
        }

        public void Rollback()
        {
            _transaction?.Rollback();
            _transaction?.Dispose();
            _transaction = null;
        }

        public void Dispose()
        {
            if (_disposed) return;
            _transaction?.Dispose();
            Connection.Dispose();
            _disposed = true;
        }
    }
}
