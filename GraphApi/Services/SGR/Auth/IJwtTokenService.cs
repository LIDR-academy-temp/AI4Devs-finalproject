using GraphApi.Models.SGR.Auth;

namespace GraphApi.Services.SGR.Auth;

public interface IJwtTokenService
{
    (string Token, DateTime ExpiraUtc) CreateAccessToken(UserAuthRow user, int accessMinutes);
}
