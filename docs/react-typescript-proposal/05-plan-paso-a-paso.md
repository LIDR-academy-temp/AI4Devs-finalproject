# 5. Plan paso a paso

## Paso 1: cerrar el contrato documental

Confirmar campos, reglas, permisos funcionales, tipos de documento y comportamiento de archivos usando `dataModel.md`, `DataBase_flow.md` y el código de `VES`.

**Salida:** contrato funcional aprobado.

## Paso 2: definir la API sin implementación

Crear el contrato OpenAPI de los endpoints documentales y los errores esperados.

**Salida:** `api-spec.yml` para documentos.

## Paso 3: crear el esqueleto frontend

Inicializar React + TypeScript con Vite, rutas, configuración de calidad y una primera pantalla vacía de documentos.

**Salida:** aplicación ejecutable con navegación base.

## Paso 4: construir el listado

Implementar consulta, paginación, filtro por tipo, estados de carga y pruebas del listado.

**Salida:** primer flujo usable sin modificar Web Forms.

## Paso 5: construir detalle y edición

Agregar consulta de detalle, validación de formulario y creación/actualización mediante la API.

**Salida:** flujo de mantenimiento de metadatos.

## Paso 6: integrar archivos

Agregar carga, descarga, nombre, tipo MIME, tamaño máximo y manejo de errores.

**Salida:** ciclo completo de archivo validado.

## Paso 7: integrar el mock de seguridad

Implementar un mock que proporcione identidad y permisos simulados para representar escenarios permitidos, sin identidad y sin permiso. El backend debe consumir ese contexto simulado antes de ejecutar las operaciones protegidas.

No se realizará integración con `SeguridadVES`, inicio de sesión real, validación de tokens ni conexión con un proveedor de identidad.

**Salida:** operaciones protegidas funcionalmente mediante identidad y permisos simulados.

## Paso 8: validar convivencia

Probar la nueva aplicación junto con Web Forms, usando datos controlados y sin cambiar todavía el módulo legacy.

**Salida:** decisión de piloto o ampliación.

## Paso 9: migrar gradualmente

Mover usuarios o rutas por etapas. Mantener un mecanismo de retorno a Web Forms durante el piloto.

**Salida:** transición reversible y medible.

## Criterio de avance

No se debe iniciar el siguiente paso si el anterior no tiene una salida verificable y documentada.
