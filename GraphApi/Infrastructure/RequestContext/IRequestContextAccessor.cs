namespace GraphApi.Infrastructure.RequestContext
{
    public interface IRequestContextAccessor
    {
        RequestContextData GetRequiredContext();

        RequestContextData GetOptionalContext();
    }
}