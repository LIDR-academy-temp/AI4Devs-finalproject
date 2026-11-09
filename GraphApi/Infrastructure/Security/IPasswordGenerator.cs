namespace GraphApi.Infrastructure.Security;

public interface IPasswordGenerator
{
    string Generar(int longitud = 12);
}
