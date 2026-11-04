using System.Data;
using Dapper;

namespace GraphApi.Infrastructure.Dapper;

/// <summary>Dapper no mapea <see cref="DateOnly"/> sin handler explícito (parámetros y lectura).</summary>
public sealed class DateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly>
{
    public override void SetValue(IDbDataParameter parameter, DateOnly value)
    {
        parameter.Value = value.ToDateTime(TimeOnly.MinValue);
        parameter.DbType = DbType.Date;
    }

    public override DateOnly Parse(object value) =>
        value switch
        {
            DateOnly d => d,
            DateTime dt => DateOnly.FromDateTime(dt),
            _ => DateOnly.FromDateTime(Convert.ToDateTime(value)),
        };
}

public sealed class NullableDateOnlyTypeHandler : SqlMapper.TypeHandler<DateOnly?>
{
    public override void SetValue(IDbDataParameter parameter, DateOnly? value)
    {
        if (value is null)
        {
            parameter.Value = DBNull.Value;
            return;
        }

        parameter.Value = value.Value.ToDateTime(TimeOnly.MinValue);
        parameter.DbType = DbType.Date;
    }

    public override DateOnly? Parse(object value) =>
        value switch
        {
            null or DBNull => null,
            DateOnly d => d,
            DateTime dt => DateOnly.FromDateTime(dt),
            _ => DateOnly.FromDateTime(Convert.ToDateTime(value)),
        };
}

public static class DapperDateOnlyBootstrap
{
    private static int _registered;

    public static void EnsureRegistered()
    {
        if (Interlocked.Exchange(ref _registered, 1) == 1)
        {
            return;
        }

        SqlMapper.AddTypeHandler(new DateOnlyTypeHandler());
        SqlMapper.AddTypeHandler(new NullableDateOnlyTypeHandler());
    }
}
