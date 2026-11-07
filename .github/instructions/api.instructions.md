---
applyTo: "backend/app/api/**"
---

# Revisión de la API

La API solo lee lo que el worker ya validó y guardó. Atiende cuentas de clientes reales.

- **Contrato regenerado.** Si cambia una ruta, un esquema de Pydantic, un código de estado o un código de error, el pull request debe incluir `frontend/openapi.json` y `frontend/src/servicios/api-tipos.ts` regenerados. Sin ellos falla `test_contrato_frontend.py`; señalarlo antes.
- **Autorización por estación.** Toda ruta que devuelve datos de una estación o de un sensor comprueba que la cuenta tiene esa estación asignada. Señalar como **Bloqueante** una consulta por identificador que no lo verifique.
- **Respuestas que no revelan cuentas.** El registro y el recupero responden con el mismo mensaje y el mismo código exista o no el correo, y el ingreso no dice si falló el correo o la contraseña (`account-lifecycle`, `account-recovery`, `account-access`). Señalar un mensaje o un código distinto según la cuenta exista.
- **Validación de entradas.** Rangos de fechas, longitudes y formatos se validan con Pydantic o en la ruta, con un error 422 claro. Las fechas se interpretan en hora de Argentina.
- **Nada sensible en los registros.** Ni contraseñas, ni hashes, ni tokens de enlaces, ni cookies, ni correos completos en los mensajes de registro o de error.
- **Sin llamadas a SAT2.** La API nunca habla con SAT2; eso es de `app/ingesta`.
- **Vigencia al leer.** Las rutas que devuelven la recomendación aplican la regla R2 con la hora actual al responder.
- **Errores uniformes.** Usar los errores de `errores.py`, sin trazas internas en la respuesta.
