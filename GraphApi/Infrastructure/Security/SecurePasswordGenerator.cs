using System.Security.Cryptography;

namespace GraphApi.Infrastructure.Security;

public sealed class SecurePasswordGenerator : IPasswordGenerator
{
    private const string Alphabet = "abcdefghijkmnopqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";

    public string Generar(int longitud = 12)
    {
        if (longitud < 8 || longitud > 64)
        {
            throw new ArgumentOutOfRangeException(nameof(longitud));
        }

        var chars = new char[longitud];
        var bytes = new byte[longitud];
        RandomNumberGenerator.Fill(bytes);
        for (var i = 0; i < longitud; i++)
        {
            chars[i] = Alphabet[bytes[i] % Alphabet.Length];
        }

        return new string(chars);
    }
}
