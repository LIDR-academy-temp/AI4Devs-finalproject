# Registro de prompts en docs/ai-log.md

Al terminar de responder cada prompt del usuario, agrega una entrada a `docs/ai-log.md`.

- Registra **todos** los prompts, sin filtrar por relevancia.
- Si el archivo no existe, créalo con el encabezado `# Registro de uso de IA`.
- Solo agrega entradas al final; nunca edites ni elimines las anteriores.
- Numera de forma consecutiva, a partir de la última entrada.
- Copia el prompt **textualmente**, sin corregirlo ni resumirlo.
- Toma el modelo y la herramienta de lo que indique el usuario. Si no los conoces, pregunta; no los inventes.
- En **Resultado**, escribe una o dos oraciones sobre lo que se obtuvo y dónde quedó (archivo, sección o chat). No repitas el prompt.
- Sustituye credenciales, tokens y datos personales por `[REDACTADO]`.
- No escribas en `prompts.md`: ese archivo es una selección manual de los prompts clave.

Plantilla de cada entrada:

````markdown
### Prompt N

- **Categoría:** `<emoji> <categoría>`
- **Modelo:** <modelo y nivel de esfuerzo>
- **Herramienta:** <herramienta utilizada>
- **Prompt:**

  ```markdown
  <texto literal del prompt>
  ```

- **Resultado:** <resumen de lo que produjo y dónde quedó>
````

Categorías: `📏 Reglas del proyecto`, `📝 Documentación`, `💻 Código`, `🧪 Pruebas`, `🚀 Despliegue`, `🔍 Investigación`. Se pueden agregar más si hace falta.
