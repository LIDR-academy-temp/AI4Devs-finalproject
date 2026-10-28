using System;
using System.ComponentModel.DataAnnotations;

namespace Web.Models.Residente
{
    public sealed class ResidentMascotaViewModel
    {
        public int? MascotaID { get; set; }
        public int? UsuarioID { get; set; }
        public string Nombre { get; set; } = string.Empty;
        public string? RazaLibre { get; set; }
        public DateTime? FechaNacimiento { get; set; }
        public bool bEliminado { get; set; }
    }

    public sealed class MascotaFormViewModel
    {
        public int? MascotaID { get; set; }
        public int? UsuarioID { get; set; }
        [Required(ErrorMessage = "El nombre es obligatorio.")]
        [StringLength(100, ErrorMessage = "El nombre no puede superar los 100 caracteres.")]
        [RegularExpression(@"^[\p{L}0-9 \.\,\-']+$", ErrorMessage = "El nombre contiene caracteres no permitidos.")]
        public string Nombre { get; set; } = string.Empty;

        [StringLength(200, ErrorMessage = "La raza no puede superar los 200 caracteres.")]
        [RegularExpression(@"^[\p{L}0-9 \.\,\-']*$", ErrorMessage = "La raza contiene caracteres no permitidos.")]
        public string? RazaLibre { get; set; }
    }

    public sealed class ResidentAutomovilViewModel
    {
        public int? AutomovilID { get; set; }
        public int? UsuarioID { get; set; }
        public string ModeloLibre { get; set; } = string.Empty;
        public string Placas { get; set; } = string.Empty;
        public string? Color { get; set; }
        public bool bEliminado { get; set; }
    }

    public sealed class AutomovilFormViewModel
    {
        public int? AutomovilID { get; set; }
        public int? UsuarioID { get; set; }
        [StringLength(200, ErrorMessage = "El modelo no puede superar los 200 caracteres.")]
        public string ModeloLibre { get; set; } = string.Empty;

        [Required(ErrorMessage = "Las placas son obligatorias.")]
        [StringLength(10, ErrorMessage = "Las placas no pueden superar los 10 caracteres.", MinimumLength = 4)]
        [RegularExpression("^[A-Za-z0-9\\- ]+$", ErrorMessage = "Placas con caracteres no permitidos.")]
        public string Placas { get; set; } = string.Empty;
    }
}
