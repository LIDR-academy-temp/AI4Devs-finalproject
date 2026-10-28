namespace GraphApi.Models.USR.CuartaMascotas;

public record MascotaListItemDto(
    int MascotaId,
    int UsuarioId,
    string? NombreUsuario,
    string? CorreoUsuario,
    string NombreMascota,
    int? TipoMascotaId,
    string? TipoMascota,
    int? RazaMascotaId,
    string? RazaMascota,
    string? RazaLibre,
    bool? VacunasAlDia,
    DateTime? FechaUltimaVacuna,
    DateTime? FechaNacimiento,
    string? NumeroCasa
);

public record TipoMascotaDto(int TipoMascotaId, string TipoMascota);
public record RazaMascotaDto(int RazaMascotaId, string RazaMascota, int TipoMascotaId);

public record MascotaCrearRequest(
    string NombreMascota,
    int? TipoMascotaId,
    int? RazaMascotaId,
    string? RazaLibre,
    bool? VacunasAlDia,
    DateTime? FechaUltimaVacuna,
    DateTime? FechaNacimiento
);

public record MascotaActualizarRequest(
    string? NombreMascota,
    int? TipoMascotaId,
    int? RazaMascotaId,
    string? RazaLibre,
    bool? VacunasAlDia,
    DateTime? FechaUltimaVacuna,
    DateTime? FechaNacimiento
);
