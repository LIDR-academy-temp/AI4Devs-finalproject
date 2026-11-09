using Swashbuckle.AspNetCore.Annotations;

namespace GraphApi.Models.USR.Mascotas
{
    [SwaggerSchema("Modelo de lectura de un Mascota")]
    [GraphQLDescription("Objeto que representa un Mascota existente.")]
    public class clReadMascotas
    {
        [SwaggerSchema("Identificador único del Mascota")]
        [GraphQLDescription("Identificador único del Mascota")]
        public int? MascotaID { get; set; }
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("NombreUsuario")]
        [GraphQLDescription("NombreUsuario")]
        public string? NombreUsuario { get; set; } = default!;
        [SwaggerSchema("CorreoUsuario")]
        [GraphQLDescription("CorreoUsuario")]
        public string? CorreoUsuario { get; set; } = default!;
        [SwaggerSchema("NombreMascota")]
        [GraphQLDescription("NombreMascota")]
        public string? NombreMascota { get; set; } = default!;
        [SwaggerSchema("TipoMascotaID")]
        [GraphQLDescription("TipoMascotaID")]
        public int? TipoMascotaID { get; set; }
        [SwaggerSchema("TipoMascota")]
        [GraphQLDescription("TipoMascota")]
        public string? TipoMascota { get; set; } = default!;
        [SwaggerSchema("RazaMascotaID")]
        [GraphQLDescription("RazaMascotaID")]
        public int? RazaMascotaID { get; set; }
        [SwaggerSchema("RazaLibre")]
        [GraphQLDescription("RazaLibre (valor libre introducido por usuario)")]
        public string? RazaLibre { get; set; } = default!;
        [SwaggerSchema("RazaMascota")]
        [GraphQLDescription("RazaMascota")]
        public string? RazaMascota { get; set; } = default!;
        [SwaggerSchema("FechaNacimiento")]
        [GraphQLDescription("FechaNacimiento")]
        public DateTime? FechaNacimiento { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de creación de un Mascota")]
    [GraphQLDescription("Input para crear un Mascota.")]
    public class clCreateMascotas
    {
        [GraphQLNonNullType] [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int UsuarioID { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("NombreMascota")]
        [GraphQLDescription("NombreMascota")]
        public string NombreMascota { get; set; } = default!;
        [SwaggerSchema("TipoMascotaID")]
        [GraphQLDescription("TipoMascotaID")]
        public int? TipoMascotaID { get; set; }
        [SwaggerSchema("RazaMascotaID")]
        [GraphQLDescription("RazaMascotaID")]
        public int? RazaMascotaID { get; set; }
        [SwaggerSchema("RazaLibre")]
        [GraphQLDescription("RazaLibre (valor libre introducido por usuario)")]
        public string? RazaLibre { get; set; }
        [SwaggerSchema("FechaNacimiento")]
        [GraphQLDescription("FechaNacimiento")]
        public DateTime? FechaNacimiento { get; set; }
        [GraphQLNonNullType] [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool bEliminado { get; set; }
    }

    [SwaggerSchema("Modelo de actualización de un Mascota")]
    [GraphQLDescription("Input para actualizar parcialmente un Mascota.")]
    public class clUpdateMascotas
    {
        [SwaggerSchema("Identificador único del Mascota")]
        [GraphQLDescription("Identificador único del Mascota")]
        public int? MascotaID { get; set; }
        [SwaggerSchema("UsuarioID")]
        [GraphQLDescription("UsuarioID")]
        public int? UsuarioID { get; set; }
        [SwaggerSchema("NombreMascota")]
        [GraphQLDescription("NombreMascota")]
        public string? NombreMascota { get; set; }
        [SwaggerSchema("TipoMascotaID")]
        [GraphQLDescription("TipoMascotaID")]
        public int? TipoMascotaID { get; set; }
        [SwaggerSchema("RazaMascotaID")]
        [GraphQLDescription("RazaMascotaID")]
        public int? RazaMascotaID { get; set; }
        [SwaggerSchema("RazaLibre")]
        [GraphQLDescription("RazaLibre (valor libre introducido por usuario)")]
        public string? RazaLibre { get; set; }
        [SwaggerSchema("FechaNacimiento")]
        [GraphQLDescription("FechaNacimiento")]
        public DateTime? FechaNacimiento { get; set; }
        [SwaggerSchema("bEliminado")]
        [GraphQLDescription("bEliminado")]
        public bool? bEliminado { get; set; }
    }
}
