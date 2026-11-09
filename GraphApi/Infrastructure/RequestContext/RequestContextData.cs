namespace GraphApi.Infrastructure.RequestContext
{
    public sealed class RequestContextData
    {
        public string EnvironmentKey { get; init; } = "Default";
        public int UserId { get; init; }
        public string WindowName { get; init; } = "NoWindow";
    }
}