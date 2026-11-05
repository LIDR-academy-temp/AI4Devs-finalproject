"""Esquemas compartidos por el registro y la autogestión de cuentas."""

from typing import Annotated

from pydantic import BaseModel, BeforeValidator, Field, StringConstraints

SIN_CONTROL = r"^[^\x00-\x1f\x7f]+$"
CORREO = r"^[^\s@\x00-\x1f\x7f]+@[^\s@\x00-\x1f\x7f]+\.[^\s@\x00-\x1f\x7f]+$"


def _vacio_es_nulo(valor: object) -> object:
    return None if isinstance(valor, str) and not valor.strip() else valor


def Texto(maximo: int):  # noqa: N802 - se usa como un tipo
    return Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=maximo, pattern=SIN_CONTROL)]


def TextoOpcional(maximo: int, patron: str = SIN_CONTROL):  # noqa: N802
    """Un texto vacío se guarda como nulo; las restricciones se aplican solo al texto."""
    texto = Annotated[str, StringConstraints(strip_whitespace=True, max_length=maximo, pattern=patron)]
    return Annotated[texto | None, BeforeValidator(_vacio_es_nulo)]


Correo = Annotated[str, StringConstraints(strip_whitespace=True, max_length=254, pattern=CORREO)]
# La contraseña nunca se recorta: un espacio al final es parte de ella.
Contrasena = Annotated[str, Field(min_length=1, max_length=1024)]
Codigo = Annotated[str, Field(min_length=1, max_length=200, pattern=r"^[A-Za-z0-9_-]+$")]
Telefono = TextoOpcional(40, r"^[0-9+()\- ]+$")


class DatosPersonales(BaseModel):
    nombre: Texto(120)
    apellido: Texto(120)
    localidad: Texto(120)
    provincia: Texto(60)
    organizacion: TextoOpcional(160) = None
    telefono: Telefono = None
    acepta_novedades: bool = False


class Aviso(BaseModel):
    mensaje: str
