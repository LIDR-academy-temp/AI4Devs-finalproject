using FluentValidation;

namespace GraphApi.Models.VTS.CuartaVisitasGeneradas;

public sealed class CrearPaseAdminRequestValidator : AbstractValidator<CrearPaseAdminRequest>
{
    public CrearPaseAdminRequestValidator()
    {
        RuleFor(x => x.UsuarioVisitadoId).GreaterThan(0);
        RuleFor(x => x.NombreVisitante).NotEmpty();
    }
}
