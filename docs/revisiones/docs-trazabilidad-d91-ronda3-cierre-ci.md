# Revisión adversarial

- Fecha: 2026-11-19 15:47 EST
- Perfil: `openai` · protocolo `openai-responses`
- Modelo pedido: `gpt-5.6-sol` · modelo que respondió: `gpt-5.6-sol`
- Archivo: `<espacio-temporal>/encargo-ci-ronda3-cierre.md` · huella `12e7d17b39e7` · 1526 caracteres
- Archivo: `<espacio-temporal>/diff-ci-ronda3.diff` · huella `76f4967ec05a` · 1894 caracteres
- Archivo: `.github/workflows/ci.yml` · huella `3ef606a34dec` · 2992 caracteres
- Archivo: `scripts/verificar-referencias.py` · huella `bc52f42348e0` · 24247 caracteres
- Archivo: `CLAUDE.md` · huella `a43d94699481` · 9403 caracteres
- Archivo: `docs/trazabilidad/README.md` · huella `e78734a07364` · 19272 caracteres
- Naturaleza: opinión de un modelo, no veredicto. No bloquea nada.

---

## Hallazgos

### 1. ALTO — La rama de entrega puede pasar en verde sin comprobar inmutabilidad cuando `before` no existe

**Qué está mal:** El flujo declara que una referencia ausente debe hacer fallar la comprobación, pero ante una creación o recreación de `feature/entrega-1-JC` ejecuta deliberadamente el verificador sin `--base`.

**Evidencia:**

- `.github/workflows/ci.yml`, paso **“Toda referencia del repositorio resuelve y ninguna copia cambió (D-91)”**:

  > `# Si falta la referencia, el verificador dice que quedó ciego y falla.`

  pero la última rama hace:

  > `python3 scripts/verificar-referencias.py`

- `scripts/verificar-referencias.py`, descripción de inmutabilidad:

  > `5. Inmutabilidad (solo con --base REF).`

  y el resultado reconoce explícitamente:

  > `sin comprobar inmutabilidad (falta --base)`

- `CLAUDE.md` §7:

  > `En la integración continua el verificador corre con --base`

- `docs/trazabilidad/README.md`, “Cómo se comprueba”:

  > `en la integración continua, que lo corre con --base`

**Regla o escenario que se rompe y fallo observable:** En la creación —y especialmente en la recreación tras haber existido— de `feature/entrega-1-JC`, `github.event.before` vale cero. Si el nuevo árbol contiene una copia histórica modificada y se actualiza también su huella en el índice, las comprobaciones actuales pueden terminar con código 0 y mostrar literalmente “sin comprobar inmutabilidad”. La corrida de recreación queda verde aunque no verificó que “ninguna copia cambió”.

Esto contradice tanto el nombre del paso como `CLAUDE.md` y el índice. El material no demuestra además qué ocurre con la corrida asociada a la eliminación previa, por lo que no puede sostener que el ciclo completo de borrar y recrear siempre produzca algún rojo.

---

### 2. ALTO — Un tag llamado `feature/entrega-1-JC` se confunde con la rama de entrega y usa una base incorrecta o ninguna

**Qué está mal:** La decisión distingue ramas, pero el condicional solo compara `github.ref_name` y no comprueba `github.ref_type`; el evento `push` también incluye tags.

**Evidencia:**

- `.github/workflows/ci.yml`:

  > `on:`  
  > `  push:`

  sin filtro de ramas ni exclusión de tags.

- En el mismo archivo:

  > `RAMA: ${{ github.ref_name }}`  
  > `ENTREGA="feature/entrega-1-JC"`  
  > `elif [ "$RAMA" != "$ENTREGA" ]; then`

- `encargo-ci-ronda3-cierre.md`, descripción del cambio:

  > `Push a una rama de tramo (cualquier rama que no sea feature/entrega-1-JC)`

  y:

  > `Push a feature/entrega-1-JC: compara con lo que había antes del push`

La implementación no demuestra que la referencia sea una rama.

**Regla o escenario que se rompe y fallo observable:** Al crear un tag denominado exactamente `feature/entrega-1-JC`, `ref_name` coincide con `ENTREGA` y `before` normalmente representa una referencia nueva. El flujo entra en la salida sin `--base` y puede quedar verde con una copia modificada y su huella actualizada. Si el tag ya existía, la comparación sería contra el destino anterior del tag, no contra la rama de entrega. En ambos casos el paso afirma comprobar la regla de una rama usando una referencia de otro tipo.

---

### 3. MEDIO — Toda rama distinta de la entrega se trata como rama de tramo, aunque D-90 no garantiza esa equivalencia

**Qué está mal:** El condicional convierte “no es la rama de entrega” en “es una rama de tramo nacida de la entrega”, supuesto que no está establecido por D-90.

**Evidencia:**

- `CLAUDE.md` §6:

  > `Cada tramo del recorte se construye en su propia rama, que sale de feature/entrega-1-JC`

  Esto solo establece cómo se crean las ramas de tramo; no declara que todas las demás ramas del repositorio sean ramas de tramo.

- `.github/workflows/ci.yml`:

  > `elif [ "$RAMA" != "$ENTREGA" ]; then`  
  > `  python3 scripts/verificar-referencias.py --base "origin/$ENTREGA"`

- `encargo-ci-ronda3-cierre.md`:

  > `Push a una rama de tramo (cualquier rama que no sea feature/entrega-1-JC)`

La aclaración entre paréntesis amplía indebidamente “rama de tramo” a cualquier rama o referencia cuyo nombre no coincida.

**Regla o escenario que se rompe y fallo observable:** Un push a `main`, una rama de mantenimiento u otra rama no originada en la entrega se compara contra `origin/feature/entrega-1-JC`. Si esa rama no contiene copias agregadas posteriormente a la entrega, `git diff` las presenta como eliminadas y la CI falla aunque el push no haya modificado ninguna copia de su propia historia. También una rama de tramo rezagada puede fallar por archivos añadidos a la entrega después de que la rama salió de ella. Por tanto, “la rama de la entrega, de la que sale” es un supuesto móvil, no una propiedad comprobada.

---

### 4. MEDIO — Los escenarios probados no cubren las dos rutas que pueden quedar ciegas

**Qué está mal:** La verificación declarada solo cubre los caminos ordinarios y omite la ausencia de `before`, el tipo de referencia y las ramas no pertenecientes a un tramo.

**Evidencia:**

- `encargo-ci-ronda3-cierre.md`:

  > `Se probó en local el paso del workflow en tres casos: rama de tramo pasa, pull request pasa, push a la entrega con una copia cambiada falla.`

- `diff-ci-ronda3.diff` solo cambia `.github/workflows/ci.yml`; no agrega un escenario automatizado para la lógica de despacho.
- El paso:

  > `python3 tests/harness/prueba-verificar-referencias.py`

  prueba el verificador, pero el defecto está antes de este: en la selección de si se le pasa `--base` y cuál.

**Regla o escenario que se rompe y fallo observable:** No hay escenario indicado para `before` vacío/cero, tag con el mismo nombre que la entrega, ausencia de `origin/feature/entrega-1-JC`, rama ajena al esquema D-90 o rama de tramo rezagada. Los dos primeros permiten precisamente que el paso quede verde sin comprobar inmutabilidad; los demás pueden producir falsos rojos o dependencia de una referencia móvil.

## Conclusión

En el recorrido ordinario —PR de tramo hacia `feature/entrega-1-JC` y posterior push de squash a esa rama— no se observa un hueco directo: el PR compara con su base y el push de la entrega compara con el SHA anterior. Sin embargo, el cambio **no es coherente** con la afirmación absoluta de que la CI siempre usa `--base` ni con el comentario de que una referencia ausente falla. La creación o recreación de la rama de entrega y la colisión con un tag producen corridas verdes sin comprobación de inmutabilidad.
