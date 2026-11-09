using FluentValidation;
using GraphApi.Models.SGR.Usuarios;

namespace GraphApi.Models.SGR.Validators
{
    public class UpdateUsuariosValidator : AbstractValidator<clUpdateUsuarios>
    {
        public UpdateUsuariosValidator()
        {
            RuleFor(x => x.UsuarioID)
                .NotNull().WithMessage("UsuarioID es obligatorio para actualizar.")
                .GreaterThan(0).WithMessage("UsuarioID debe ser mayor que 0.");

            RuleFor(x => x.CorreoUsuario)
                .EmailAddress().WithMessage("CorreoUsuario debe ser un correo electrónico válido.")
                .MaximumLength(200).WithMessage("CorreoUsuario no puede superar 200 caracteres.")
                .When(x => x.CorreoUsuario != null);

            RuleFor(x => x.PasswordUsuario)
                .MinimumLength(8).WithMessage("PasswordUsuario debe tener al menos 8 caracteres.")
                .When(x => x.PasswordUsuario != null);

            RuleFor(x => x.NombreUsuario)
                .MaximumLength(100).WithMessage("NombreUsuario no puede superar 100 caracteres.")
                .When(x => x.NombreUsuario != null);

            RuleFor(x => x.TelefonoUsuario)
                .MaximumLength(30).WithMessage("TelefonoUsuario no puede superar 30 caracteres.")
                .When(x => x.TelefonoUsuario != null);
        }
    }
}
