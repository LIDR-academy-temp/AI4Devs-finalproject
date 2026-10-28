using System.ComponentModel.DataAnnotations;
using Microsoft.AspNetCore.Mvc.Rendering;

namespace Web.Models.Login
{
    public class LoginViewModel
    {
        [Display(Name = "Coto")]
        public int CondominioID { get; set; }

        public string SelectedCondominioName { get; set; } = "Cuarta Quinientos";

        public IReadOnlyList<SelectListItem> CondominioOptions { get; set; } = Array.Empty<SelectListItem>();

        [Required, Display(Name = "Usuario o correo")]
        public string Username { get; set; } = "";

        [Required, DataType(DataType.Password), Display(Name = "Contraseña")]
        public string Password { get; set; } = "";

        public string? ReturnUrl { get; set; }

       

    }

    public class LoginForgotViewModel
    {
        [Required, EmailAddress, Display(Name = "Correo electrónico")]
        public string EmailForgot { get; set; } = "";
        public string? ReturnUrl { get; set; }
    }

    public class ResetPasswordViewModel
    {
        public string Token { get; set; } = "";

        [Required, DataType(DataType.Password), Display(Name = "Nueva contraseña")]
        [MinLength(6, ErrorMessage = "Mínimo 6 caracteres.")]
        public string PasswordNuevo { get; set; } = "";

        [Required, DataType(DataType.Password), Display(Name = "Confirmar contraseña")]
        [Compare(nameof(PasswordNuevo), ErrorMessage = "Las contraseñas no coinciden.")]
        public string PasswordConfirmar { get; set; } = "";
    }

}
