using FluentValidation;
using GraphApi.Models.SGR.Usuarios;

namespace GraphApi.Models.SGR.Validators
{
    public class CreateUsuariosValidator : AbstractValidator<clCreateUsuarios>
    {
        public CreateUsuariosValidator()
        {
            RuleFor(x => x.CorreoUsuario)
                .NotEmpty().WithMessage("CorreoUsuario es obligatorio.")
                .EmailAddress().WithMessage("CorreoUsuario debe ser un correo electrónico válido.")
                .MaximumLength(200).WithMessage("CorreoUsuario no puede superar 200 caracteres.");

            RuleFor(x => x.PasswordUsuario)
                .NotEmpty().WithMessage("PasswordUsuario es obligatorio.")
                .MinimumLength(8).WithMessage("PasswordUsuario debe tener al menos 8 caracteres.");

            RuleFor(x => x.NombreUsuario)
                .NotEmpty().WithMessage("NombreUsuario es obligatorio.")
                .MaximumLength(100).WithMessage("NombreUsuario no puede superar 100 caracteres.");

            RuleFor(x => x.TelefonoUsuario)
                .MaximumLength(30).WithMessage("TelefonoUsuario no puede superar 30 caracteres.")
                .When(x => x.TelefonoUsuario != null);

            RuleFor(x => x.FotoUrlUsuario)
                .MaximumLength(500).WithMessage("FotoUrlUsuario no puede superar 500 caracteres.")
                .When(x => x.FotoUrlUsuario != null);
        }
    }
}
