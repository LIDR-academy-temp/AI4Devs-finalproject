using FluentValidation;

namespace GraphApi.Models.SGR.Usuarios;

public sealed class CrearUsuarioAdminRequestValidator : AbstractValidator<CrearUsuarioAdminRequest>
{
    private static readonly string[] PerfilesPermitidos =
        ["Administrador", "Residente", "Guardia", "Trabajador"];

    public CrearUsuarioAdminRequestValidator()
    {
        RuleFor(x => x.Nombre).NotEmpty().MaximumLength(100);
        RuleFor(x => x.Correo).NotEmpty().EmailAddress().MaximumLength(100);
        RuleFor(x => x.Telefono)
            .Matches(@"^\d{7,15}$")
            .When(x => !string.IsNullOrWhiteSpace(x.Telefono));
        RuleFor(x => x.Perfil)
            .Must(p => PerfilesPermitidos.Contains(p, StringComparer.OrdinalIgnoreCase))
            .WithMessage("Perfil no válido.");
        RuleFor(x => x.CasaId).GreaterThan(0).When(x => x.CasaId.HasValue);
    }
}
