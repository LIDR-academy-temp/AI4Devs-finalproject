#!/usr/bin/env python3
"""
Prueba con datos del modelo del aviso que entrega HU-06.1 (tramo 4).
Origen: openspec/specs/aviso-inicio/spec.md, sección «Datos» (tablas cliente,
asignacion y aviso_inicio) y requisitos «La asignación es coherente en la
base» (días laborables), «Un aviso por asignación y día» (HU-06.CA-3) y «El
aviso no se edita ni se quita» (HU-06.CA-13); HU-06.CA-12 (la zona horaria
es la del cliente).

- cliente: su zona horaria es un nombre de la lista estándar; alias único
  dentro de su organización.
- asignacion: vigencia, horario y días laborables coherentes; supervisor
  distinto del consultor; consultor, supervisor y cliente de su misma
  organización.
- aviso_inicio: uno por asignación y día; de una asignación de su misma
  organización; nadie lo edita ni lo quita en ninguna escritura, tampoco el
  dueño de la tabla ni la credencial del sistema; ninguna identidad con la que
  se conecte el sistema puede insertarlo ni apagar el bloqueo. Hasta ahí llega:
  el dueño de la tabla sí puede apagar el disparador antes de escribir, y es el
  rol de las migraciones, que el sistema en servicio no usa (P11 y N29).

Fuera de este ticket, y por eso sin casos aquí: los roles de la asignación
(usuario_rol, HU-02.1), el registro del aviso con su hora y su clasificación
(HU-06.3) y las reglas por rol (HU-02.1).

Los avisos se crean siempre dentro de transacciones que se deshacen: por
diseño, después nadie puede quitarlos. Crea cuentas de prueba con correo de
example.com y dos organizaciones de prueba, que quita al terminar.

Uso:  python3 tests/base/prueba-aviso-modelo.py
Sale con 0 si todos los casos dan lo esperado, y con 1 si alguno falla.
"""
import sys
import uuid
from pathlib import Path

RAIZ = Path(__file__).resolve().parents[2]
sys.path.insert(0, str(RAIZ / "scripts" / "base"))
from base_local import psql, psql_ok  # noqa: E402
from api_local import crear_cuenta, quitar_cuenta  # noqa: E402

COLUMNAS_ASIGNACION = ("organizacion_id, consultor_id, supervisor_id, cliente_id, "
                       "inicio, fin, hora_inicio, hora_fin, dias_laborables")


def main() -> int:
    resultados = []

    def caso(nombre: str, ok: bool, detalle):
        resultados.append(ok)
        print(f"{'✓' if ok else '✗'} {nombre}: {detalle}")

    def primera_linea(texto: str) -> str:
        return texto.strip().splitlines()[0] if texto.strip() else "(sin mensaje)"

    def corre(sql: str, antes: str = "", rol: str = "") -> tuple[bool, str]:
        """`sql` en una transacción que se deshace. (salió bien, salida o primer mensaje del motor)."""
        cambio = f"set local role {rol};\n" if rol else ""
        r = psql(f"begin;\n{antes}\n{cambio}{sql}\nrollback;\n")
        return r.returncode == 0, (r.stdout.strip() if r.returncode == 0 else primera_linea(r.stderr))

    org_a = psql_ok(f"insert into public.organizacion (nombre, zona_horaria) "
                    f"values ('Organización A {uuid.uuid4()}', 'America/Panama') returning id;").strip()
    org_b = psql_ok(f"insert into public.organizacion (nombre, zona_horaria) "
                    f"values ('Organización B {uuid.uuid4()}', 'America/Lima') returning id;").strip()
    consultor, correo_c, _ = crear_cuenta()
    supervisor, correo_s, _ = crear_cuenta()
    ajeno, correo_x, _ = crear_cuenta()
    cuentas = [consultor, supervisor, ajeno]
    try:
        alta = psql("insert into public.usuario (id, organizacion_id, nombre, correo, telefono) values "
                    f"('{consultor}', '{org_a}', 'Consultor', '{correo_c}', '+507 6000-0001'), "
                    f"('{supervisor}', '{org_a}', 'Supervisor', '{correo_s}', '+507 6000-0002'), "
                    f"('{ajeno}', '{org_b}', 'De otra organización', '{correo_x}', '+51 900-000-003');")
        if alta.returncode != 0:
            print(f"✗ preparación: no se pudieron crear los usuarios de prueba: {primera_linea(alta.stderr)}")
            print("prueba-aviso-modelo: 0 casos corridos; la preparación falló.")
            return 1

        # ---- cliente
        def cliente(valores: str) -> tuple[bool, str]:
            return corre(f"insert into public.cliente (organizacion_id, alias, zona_horaria) values ({valores}) "
                         f"returning zona_horaria;")

        ok, d = cliente(f"'{org_a}', 'Cliente A', 'America/Bogota'")
        caso("P1 un cliente con una zona de la lista estándar se crea", ok and d == "America/Bogota", d)
        ok, d = cliente(f"'{org_a}', 'Cliente A', 'Panamá/Centro'")
        caso("N1 una zona que no está en la lista estándar: la base la rechaza", not ok and "cliente_zona_horaria_check" in d, d)
        for columna, valores in {"alias": f"'{org_a}', null, 'America/Panama'",
                                 "zona_horaria": f"'{org_a}', 'Cliente A', null",
                                 "organizacion_id": "null, 'Cliente A', 'America/Panama'"}.items():
            ok, d = cliente(valores)
            caso(f"N2 {columna} nulo: la base lo rechaza", not ok and "null value" in d, d)
        ok, d = cliente(f"'{uuid.uuid4()}', 'Cliente A', 'America/Panama'")
        caso("N3 una organización que no existe: la base lo rechaza", not ok and "cliente_organizacion_id_fkey" in d, d)

        cli_a = psql_ok(f"insert into public.cliente (organizacion_id, alias, zona_horaria) "
                        f"values ('{org_a}', 'Cliente A', 'America/Panama') returning id;").strip()
        cli_b = psql_ok(f"insert into public.cliente (organizacion_id, alias, zona_horaria) "
                        f"values ('{org_b}', 'Cliente A', 'America/Lima') returning id;").strip()
        caso("P2 el mismo alias en otra organización sí entra", bool(cli_b), cli_b)
        ok, d = cliente(f"'{org_a}', 'Cliente A', 'America/Lima'")
        caso("N4 el mismo alias dos veces en una organización: la base lo rechaza", not ok and "cliente_organizacion_id_alias_key" in d, d)

        # ---- asignacion
        def asignacion(consultor_id=consultor, supervisor_id=supervisor, cliente_id=cli_a, org=org_a,
                       inicio="'2026-11-23'", fin="null", hora_inicio="'08:00'", hora_fin="'17:00'",
                       dias="default", devolver="dias_laborables") -> tuple[bool, str]:
            valores = (f"{q(org)}, {q(consultor_id)}, {q(supervisor_id)}, {q(cliente_id)}, "
                       f"{inicio}, {fin}, {hora_inicio}, {hora_fin}, {dias}")
            return corre(f"insert into public.asignacion ({COLUMNAS_ASIGNACION}) values ({valores}) "
                         f"returning {devolver};")

        def q(valor) -> str:
            return "null" if valor is None else f"'{valor}'"

        ok, d = asignacion()
        caso("P3 una asignación sin fecha de fin nace de lunes a viernes", ok and d == "{1,2,3,4,5}", d)
        ok, d = asignacion(fin="'2026-11-23'")
        caso("P4 termina el mismo día que empieza: se acepta", ok, d)
        ok, d = asignacion(fin="'2026-11-22'")
        caso("N5 la fecha de fin es anterior a la de inicio: la base la rechaza", not ok and "asignacion_fin_check" in d, d)
        ok, d = asignacion(hora_fin="'08:00'")
        caso("N6 la hora de fin igual a la de inicio: la base la rechaza", not ok and "asignacion_horario_check" in d, d)
        ok, d = asignacion(hora_fin="'07:59'")
        caso("N7 la hora de fin antes de la de inicio: la base la rechaza", not ok and "asignacion_horario_check" in d, d)
        ok, d = asignacion(supervisor_id=consultor)
        caso("N8 el supervisor es el mismo consultor: la base la rechaza", not ok and "asignacion_supervisor_distinto_check" in d, d)
        for nombre, dias in {"N9 sin ningún día laborable": "'{}'",
                             "N10 con un día repetido": "'{1,2,2}'",
                             "N11 con el día 0": "'{0,1}'",
                             "N12 con el día 8": "'{7,8}'",
                             "N13 con un día nulo": "array[1, null]::smallint[]",
                             "N14 en dos dimensiones": "'{{1,2},{3,4}}'"}.items():
            ok, d = asignacion(dias=dias)
            caso(f"{nombre}: la base la rechaza", not ok and "asignacion_dias_laborables_check" in d, d)
        ok, d = asignacion(dias="'{6}'")
        caso("P5 solo sábado se acepta", ok and d == "{6}", d)
        ok, d = asignacion(dias="'{7,1,2,3,4,5,6}'")
        caso("P6 los siete días, en cualquier orden, se aceptan", ok, d)
        ok, d = asignacion(consultor_id=ajeno)
        caso("N15 un consultor de otra organización: la base la rechaza", not ok and "asignacion_consultor_fkey" in d, d)
        ok, d = asignacion(supervisor_id=ajeno)
        caso("N16 un supervisor de otra organización: la base la rechaza", not ok and "asignacion_supervisor_fkey" in d, d)
        ok, d = asignacion(cliente_id=cli_b)
        caso("N17 un cliente de otra organización: la base la rechaza", not ok and "asignacion_cliente_fkey" in d, d)
        for columna in ("consultor_id", "supervisor_id", "cliente_id", "inicio", "hora_inicio", "hora_fin",
                        "dias_laborables"):
            argumentos = {"consultor_id": {"consultor_id": None}, "supervisor_id": {"supervisor_id": None},
                          "cliente_id": {"cliente_id": None}, "inicio": {"inicio": "null"},
                          "hora_inicio": {"hora_inicio": "null"}, "hora_fin": {"hora_fin": "null"},
                          "dias_laborables": {"dias": "null"}}[columna]
            ok, d = asignacion(**argumentos)
            caso(f"N18 {columna} nulo: la base la rechaza", not ok and "null value" in d, d)

        asig = psql_ok(f"insert into public.asignacion ({COLUMNAS_ASIGNACION}) values ('{org_a}', '{consultor}', "
                       f"'{supervisor}', '{cli_a}', '2026-11-23', null, '08:00', '17:00', default) "
                       f"returning id;").strip()

        # ---- aviso_inicio: siempre en transacciones que se deshacen.
        def aviso(fecha="2026-11-25", asignacion_id=asig, org=org_a, recibido="'2026-11-25 13:05:00+00'",
                  minutos="null") -> str:
            return (f"insert into public.aviso_inicio (organizacion_id, asignacion_id, fecha, recibido_en, "
                    f"minutos_retraso) values ('{org}', '{asignacion_id}', '{fecha}', {recibido}, {minutos})")

        ok, d = corre(aviso() + " returning minutos_retraso is null;")
        caso("P7 un aviso puntual (sin minutos de retraso) se guarda", ok and d == "t", d)
        ok, d = corre(aviso(minutos="12") + " returning minutos_retraso;")
        caso("P8 un aviso tardío guarda sus minutos", ok and d == "12", d)
        ok, d = corre(aviso() + ";\n" + aviso(recibido="'2026-11-25 14:00:00+00'") + ";")
        caso("N19 un segundo aviso de la misma asignación el mismo día: la base lo rechaza", not ok and "aviso_inicio_asignacion_id_fecha_key" in d, d)
        ok, d = corre(aviso() + ";\n" + aviso(fecha="2026-11-26") + " returning fecha;")
        caso("P9 control de N19: el día siguiente sí entra", ok and d == "2026-11-26", d)
        ok, d = corre(aviso(org=org_b) + ";")
        caso("N20 un aviso que dice ser de otra organización que su asignación: la base lo rechaza",
             not ok and "aviso_inicio_asignacion_fkey" in d, d)
        ok, d = corre(aviso(recibido="null") + ";")
        caso("N21 sin la hora en que se recibió: la base lo rechaza", not ok and "null value" in d, d)

        creado = aviso() + ";\n"
        ok, d = corre("update public.aviso_inicio set recibido_en = recibido_en - interval '1 hour';", antes=creado)
        caso("N22 nadie edita un aviso, tampoco el dueño de la tabla: la base lo rechaza con mensaje nuestro",
             not ok and "no se edita ni se quita" in d, d)
        ok, d = corre("delete from public.aviso_inicio;", antes=creado)
        caso("N23 nadie quita un aviso, tampoco el dueño de la tabla", not ok and "no se edita ni se quita" in d, d)
        ok, d = corre("truncate public.aviso_inicio;", antes=creado)
        caso("N24 nadie vacía la tabla de avisos, tampoco el dueño", not ok and "no se edita ni se quita" in d, d)
        ok, d = corre(f"delete from public.asignacion where id = '{asig}';", antes=creado)
        caso("N25 no se quita la asignación de un aviso: el aviso no puede quedar huérfano", not ok and "aviso_inicio_asignacion_fkey" in d, d)
        ok, d = corre("select count(*) from public.aviso_inicio;", antes=creado)
        caso("P10 control de N22 a N24: el aviso se puede leer", ok and d == "1", d)
        # Hasta dónde llega la garantía: el disparador rechaza toda escritura,
        # de cualquier rol, también del dueño de la tabla. Lo que no puede es
        # impedir que el dueño apague antes el propio disparador: ALTER TABLE es
        # suyo. Ese dueño es el rol de las migraciones, que el sistema en
        # servicio no usa, y queda dentro del límite de confianza. Este caso
        # deja escrito ese límite en vez de afirmar más de lo que hay
        # (revisión del tramo 4, ronda 1, hallazgo H).
        ok, d = corre("alter table public.aviso_inicio disable trigger aviso_inicio_no_se_cambia;\n"
                      "delete from public.aviso_inicio;\n"
                      "select count(*) from public.aviso_inicio;", antes=creado)
        caso("P11 límite declarado: el dueño de la tabla puede apagar el disparador y entonces el cambio pasa; "
             "la garantía cubre toda escritura, no el apagado del mecanismo", ok and d == "0", d)
        # Y hasta dónde NO llega el límite: ninguna identidad con la que el
        # sistema se conecta es dueña de la tabla, así que no puede apagar el
        # disparador. Sin este caso, la afirmación de la especificación no
        # tenía quién la vigilara (revisión interna de la ronda 1, hallazgo 7).
        for rol in ("service_role", "authenticated", "anon"):
            ok, d = corre("alter table public.aviso_inicio disable trigger aviso_inicio_no_se_cambia;",
                          antes=creado, rol=rol)
            caso(f"N29 {rol} no puede apagar el bloqueo del aviso: no es dueño de la tabla",
                 not ok and "must be owner" in d, d)

        for rol in ("service_role", "authenticated", "anon"):
            ok, d = corre(aviso() + ";", rol=rol)
            caso(f"N26 {rol} no puede insertar un aviso: la base se lo niega por permiso",
                 not ok and "permission denied" in d, d)
            ok, d = corre("update public.aviso_inicio set minutos_retraso = 0;", antes=creado, rol=rol)
            caso(f"N27 {rol} no puede editar un aviso", not ok and "permission denied" in d, d)
            ok, d = corre("truncate public.aviso_inicio;", antes=creado, rol=rol)
            caso(f"N28 {rol} no puede vaciar la tabla de avisos", not ok and "permission denied" in d, d)
    finally:
        psql(f"delete from public.asignacion where organizacion_id in ('{org_a}', '{org_b}');")
        psql(f"delete from public.cliente where organizacion_id in ('{org_a}', '{org_b}');")
        psql(f"delete from public.usuario where organizacion_id in ('{org_a}', '{org_b}');")
        psql(f"delete from public.organizacion where id in ('{org_a}', '{org_b}');")
        for c in cuentas:
            quitar_cuenta(c)

    total, bien = len(resultados), sum(resultados)
    print(f"prueba-aviso-modelo: {bien} de {total} casos dieron lo esperado.")
    return 0 if bien == total else 1


if __name__ == "__main__":
    sys.exit(main())
