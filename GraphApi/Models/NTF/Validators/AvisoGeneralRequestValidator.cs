using FluentValidation;

namespace GraphApi.Models.NTF.Validators;

public sealed class AvisoGeneralRequestValidator : AbstractValidator<AvisoGeneralRequest>
{
    public AvisoGeneralRequestValidator()
    {
        RuleFor(x => x.Titulo).NotEmpty().MaximumLength(200);
        RuleFor(x => x.Mensaje).NotEmpty().MaximumLength(4000);
    }
}
