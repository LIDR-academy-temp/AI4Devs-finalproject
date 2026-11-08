"""Modelo de datos de Weather Track (sección 3 del README y D5, D6 y D8 del diseño)."""

import uuid
from datetime import datetime
from decimal import Decimal
from typing import Any

from sqlalchemy import (
    BigInteger,
    Boolean,
    CheckConstraint,
    DateTime,
    ForeignKey,
    Identity,
    Index,
    Integer,
    LargeBinary,
    MetaData,
    Numeric,
    String,
    Text,
    UniqueConstraint,
    Uuid,
    func,
    text,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship

MAGNITUDES = (
    "TEMPERATURA",
    "HUMEDAD_RELATIVA",
    "VIENTO_VELOCIDAD",
    "VIENTO_DIRECCION",
    "RADIACION",
    "PRESION",
    "PRECIPITACION",
    "MOJADO_FOLIAR",
    "BATERIA",
)
CALIDADES = ("OK", "FALTANTE", "SOSPECHOSO")
ORIGENES = ("INSTANTANEO", "HISTORICO")
ESTADOS_RECOMENDACION = (
    "APTO",
    "PRECAUCION",
    "RIESGO_DERIVA",
    "NO_APLICAR",
    "DATOS_INSUFICIENTES",
)
TIPOS_EJECUCION = ("CICLO", "CARGA_INICIAL")
RESULTADOS_EJECUCION = ("EN_CURSO", "EXITO", "PARCIAL", "ERROR")
NATURALEZAS = ("REAL", "FICTICIA", "COPIA_DE_PRUEBA")
PROPOSITOS_ENLACE = ("CONFIRMACION", "RECUPERO", "BAJA")


def _lista_sql(valores: tuple[str, ...]) -> str:
    return ", ".join(f"'{valor}'" for valor in valores)


class Base(DeclarativeBase):
    metadata = MetaData(
        naming_convention={
            "ix": "ix_%(table_name)s_%(column_0_N_name)s",
            "uq": "uq_%(table_name)s_%(column_0_N_name)s",
            "ck": "ck_%(table_name)s_%(constraint_name)s",
            "fk": "fk_%(table_name)s_%(column_0_name)s_%(referred_table_name)s",
            "pk": "pk_%(table_name)s",
        }
    )


class Usuario(Base):
    __tablename__ = "usuario"
    __table_args__ = (CheckConstraint("email = lower(email)", name="email_en_minusculas"),)

    id: Mapped[uuid.UUID] = mapped_column(Uuid, primary_key=True, default=uuid.uuid4)
    email: Mapped[str] = mapped_column(String(254), unique=True)
    nombre: Mapped[str] = mapped_column(String(120))
    password_hash: Mapped[str] = mapped_column(String(255))
    activo: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    creado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    # Datos del registro (weather-track-registro-cuentas, D2). Opcionales en la base para no romper
    # las cuentas anteriores; la API exige los obligatorios al registrar.
    apellido: Mapped[str | None] = mapped_column(String(120))
    organizacion: Mapped[str | None] = mapped_column(String(160))
    telefono: Mapped[str | None] = mapped_column(String(40))
    localidad: Mapped[str | None] = mapped_column(String(120))
    provincia: Mapped[str | None] = mapped_column(String(60))
    # Sin confirmar no se puede iniciar sesión.
    confirmado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    terminos_version: Mapped[str | None] = mapped_column(String(20))
    terminos_aceptados_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    acepta_novedades: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))
    # Solo se otorga desde la línea de comandos del servidor (weather-track-administracion-sat2, D1).
    es_administrador: Mapped[bool] = mapped_column(Boolean, server_default=text("false"))

    estaciones: Mapped[list["Estacion"]] = relationship(secondary="usuario_estacion")


class Estacion(Base):
    __tablename__ = "estacion"
    __table_args__ = (
        CheckConstraint("latitud BETWEEN -90 AND 90", name="latitud_valida"),
        CheckConstraint("longitud BETWEEN -180 AND 180", name="longitud_valida"),
        CheckConstraint("activa = (inactiva_desde IS NULL)", name="inactiva_con_fecha"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    id_equipo_sat2: Mapped[int] = mapped_column(Integer, unique=True)
    nombre: Mapped[str] = mapped_column(String(120))
    nro_serie: Mapped[str | None] = mapped_column(String(40))
    latitud: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    longitud: Mapped[Decimal] = mapped_column(Numeric(9, 6))
    # Inactiva: su equipo dejó de llegar de SAT2. Conserva sus datos (D1 de weather-track-estaciones).
    activa: Mapped[bool] = mapped_column(Boolean, server_default=text("true"))
    inactiva_desde: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))

    sensores: Mapped[list["Sensor"]] = relationship(back_populates="estacion")


class UsuarioEstacion(Base):
    __tablename__ = "usuario_estacion"

    usuario_id: Mapped[uuid.UUID] = mapped_column(
        ForeignKey("usuario.id", ondelete="CASCADE"), primary_key=True
    )
    estacion_id: Mapped[int] = mapped_column(
        ForeignKey("estacion.id", ondelete="CASCADE"), primary_key=True
    )


class Sensor(Base):
    __tablename__ = "sensor"
    __table_args__ = (
        UniqueConstraint("estacion_id", "id_sensor_sat2"),
        UniqueConstraint("estacion_id", "clave_normalizada"),
        CheckConstraint(f"magnitud IN ({_lista_sql(MAGNITUDES)})", name="magnitud_valida"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    estacion_id: Mapped[int] = mapped_column(ForeignKey("estacion.id"))
    id_sensor_sat2: Mapped[int] = mapped_column(Integer)
    nombre: Mapped[str] = mapped_column(String(120))
    clave_normalizada: Mapped[str] = mapped_column(String(120))
    magnitud: Mapped[str] = mapped_column(String(30))
    altura_m: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    unidad: Mapped[str] = mapped_column(String(20))

    estacion: Mapped[Estacion] = relationship(back_populates="sensores")


class Observacion(Base):
    __tablename__ = "observacion"
    __table_args__ = (
        CheckConstraint(f"calidad IN ({_lista_sql(CALIDADES)})", name="calidad_valida"),
        CheckConstraint(f"origen IN ({_lista_sql(ORIGENES)})", name="origen_valido"),
        CheckConstraint(
            "(valor IS NULL) = (calidad = 'FALTANTE')", name="valor_nulo_solo_si_faltante"
        ),
        Index("ix_observacion_medido_en", "medido_en"),
    )

    sensor_id: Mapped[int] = mapped_column(ForeignKey("sensor.id"), primary_key=True)
    medido_en: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    valor: Mapped[Decimal | None] = mapped_column(Numeric(12, 4))
    calidad: Mapped[str] = mapped_column(String(12))
    alarma: Mapped[bool | None] = mapped_column(Boolean)
    origen: Mapped[str] = mapped_column(String(12))
    recibido_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class Recomendacion(Base):
    __tablename__ = "recomendacion"
    __table_args__ = (
        UniqueConstraint("estacion_id", "medido_en", "version_metodo"),
        CheckConstraint(
            f"estado IN ({_lista_sql(ESTADOS_RECOMENDACION)})", name="estado_valido"
        ),
        CheckConstraint("indice BETWEEN 0 AND 100", name="indice_en_rango"),
        CheckConstraint(
            "(indice IS NULL) = (estado = 'DATOS_INSUFICIENTES')",
            name="indice_nulo_solo_si_insuficiente",
        ),
        CheckConstraint(
            "estado <> 'APTO' OR inversion_detectada IS FALSE",
            name="apto_sin_inversion",
        ),
        CheckConstraint(
            "jsonb_typeof(motivos) = 'array' AND jsonb_array_length(motivos) > 0",
            name="con_motivos",
        ),
        Index("ix_recomendacion_ultima", "estacion_id", text("medido_en DESC")),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    estacion_id: Mapped[int] = mapped_column(ForeignKey("estacion.id"))
    medido_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    calculado_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    version_metodo: Mapped[str] = mapped_column(String(20))
    estado: Mapped[str] = mapped_column(String(24))
    indice: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    delta_t_c: Mapped[Decimal | None] = mapped_column(Numeric(5, 2))
    inversion_detectada: Mapped[bool | None] = mapped_column(Boolean)
    motivos: Mapped[list[dict[str, Any]]] = mapped_column(JSONB)


class EjecucionIngesta(Base):
    __tablename__ = "ejecucion_ingesta"
    __table_args__ = (
        CheckConstraint(f"tipo IN ({_lista_sql(TIPOS_EJECUCION)})", name="tipo_valido"),
        CheckConstraint(
            f"resultado IN ({_lista_sql(RESULTADOS_EJECUCION)})", name="resultado_valido"
        ),
        CheckConstraint("lecturas_guardadas >= 0", name="lecturas_no_negativas"),
        CheckConstraint(
            "tipo = 'CARGA_INICIAL' OR (ventana_desde IS NULL AND ventana_hasta IS NULL)",
            name="ventana_solo_en_cargas",
        ),
        Index("ix_ejecucion_ingesta_ultima", "estacion_id", "tipo", text("iniciada_en DESC")),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    estacion_id: Mapped[int] = mapped_column(ForeignKey("estacion.id"))
    tipo: Mapped[str] = mapped_column(String(14))
    ventana_desde: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    ventana_hasta: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    iniciada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    finalizada_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    resultado: Mapped[str] = mapped_column(String(12))
    lecturas_guardadas: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    detalle: Mapped[str | None] = mapped_column(Text)


class Sesion(Base):
    __tablename__ = "sesion"
    __table_args__ = (
        CheckConstraint("vence_en > creada_en", name="vence_despues_de_crearse"),
        Index("ix_sesion_vence_en", "vence_en"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id", ondelete="CASCADE"))
    # Solo se guarda el hash: el identificador real vive únicamente en la cookie.
    hash_identificador: Mapped[str] = mapped_column(String(64), unique=True)
    creada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
    vence_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))


class ConfiguracionBase(Base):
    """Una sola fila: si la base guarda datos reales o ficticios (D4 de weather-track-estaciones)."""

    __tablename__ = "configuracion_base"
    __table_args__ = (
        CheckConstraint("id = 1", name="una_sola_fila"),
        CheckConstraint(f"naturaleza IN ({_lista_sql(NATURALEZAS)})", name="naturaleza_valida"),
    )

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False, default=1)
    naturaleza: Mapped[str] = mapped_column(String(16))
    fijada_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class EnlaceCuenta(Base):
    """Código de un solo uso de confirmación, recupero o baja. Solo se guarda su hash (D3)."""

    __tablename__ = "enlace_cuenta"
    __table_args__ = (
        CheckConstraint(f"proposito IN ({_lista_sql(PROPOSITOS_ENLACE)})", name="proposito_valido"),
        CheckConstraint("vence_en > creado_en", name="vence_despues_de_crearse"),
        Index("ix_enlace_cuenta_usuario_proposito", "usuario_id", "proposito"),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    usuario_id: Mapped[uuid.UUID] = mapped_column(ForeignKey("usuario.id", ondelete="CASCADE"))
    proposito: Mapped[str] = mapped_column(String(14))
    hash_codigo: Mapped[str] = mapped_column(String(64), unique=True)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    vence_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    usado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class CorreoSaliente(Base):
    """Bandeja de salida: el worker envía y, al terminar, borra el contenido (D4)."""

    __tablename__ = "correo_saliente"
    __table_args__ = (
        CheckConstraint("intentos >= 0", name="intentos_no_negativos"),
        Index("ix_correo_saliente_reciente", "destinatario", "tipo", "creado_en"),
        Index(
            "ix_correo_saliente_pendiente",
            "proximo_intento_en",
            postgresql_where=text("enviado_en IS NULL AND descartado_en IS NULL"),
        ),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    tipo: Mapped[str] = mapped_column(String(30))
    destinatario: Mapped[str] = mapped_column(String(254))
    asunto: Mapped[str | None] = mapped_column(String(200))
    cuerpo_texto: Mapped[str | None] = mapped_column(Text)
    cuerpo_html: Mapped[str | None] = mapped_column(Text)
    cabeceras: Mapped[dict[str, str] | None] = mapped_column(JSONB)
    creado_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    intentos: Mapped[int] = mapped_column(Integer, server_default=text("0"))
    proximo_intento_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    enviado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    descartado_en: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class LimiteIp(Base):
    """Contador de pedidos por acción y dirección IP, en ventanas fijas (D9)."""

    __tablename__ = "limite_ip"
    __table_args__ = (CheckConstraint("cantidad > 0", name="cantidad_positiva"),)

    clave: Mapped[str] = mapped_column(String(120), primary_key=True)
    ventana_inicio: Mapped[datetime] = mapped_column(DateTime(timezone=True), primary_key=True)
    cantidad: Mapped[int] = mapped_column(Integer)


class IntentoAcceso(Base):
    __tablename__ = "intento_acceso"
    __table_args__ = (Index("ix_intento_acceso_reciente", "email", text("ocurrido_en DESC")),)

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    email: Mapped[str] = mapped_column(String(254))
    ocurrido_en: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )


class ConfiguracionSat2(Base):
    """Una sola fila: la URL y las credenciales de SAT2 cifradas con la clave pública.

    Solo el worker, con la clave privada, puede leerla (D3 y D4 de weather-track-administracion-sat2).
    """

    __tablename__ = "configuracion_sat2"
    __table_args__ = (CheckConstraint("id = 1", name="una_sola_fila"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=False, default=1)
    contenido_cifrado: Mapped[bytes] = mapped_column(LargeBinary)
    cargada_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    cargada_por: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("usuario.id", ondelete="SET NULL")
    )


class CambioConfiguracionSat2(Base):
    """Quién y cuándo cambió la configuración de SAT2. Nunca guarda los valores."""

    __tablename__ = "cambio_configuracion_sat2"
    __table_args__ = (
        Index("ix_cambio_configuracion_sat2_reciente", text("ocurrido_en DESC")),
    )

    id: Mapped[int] = mapped_column(BigInteger, Identity(), primary_key=True)
    ocurrido_en: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    usuario_id: Mapped[uuid.UUID | None] = mapped_column(
        ForeignKey("usuario.id", ondelete="SET NULL")
    )
    # Aparte del usuario, para que el registro sobreviva al borrado de la cuenta.
    email_usuario: Mapped[str] = mapped_column(String(254))
