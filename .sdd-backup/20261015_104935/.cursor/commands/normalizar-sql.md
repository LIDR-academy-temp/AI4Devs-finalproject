# normalizar-sql

> **Config:** Lee `sdd-toolkit/sdd.config.yaml` → `vars` antes de ejecutar.
> Sustituye cada `<KEY>` con el valor de `vars.KEY`. Nunca usar placeholders en crudo.


Normaliza codificacion de archivos `.sql` del repo: UTF-8 con BOM y CRLF simple (sin lineas vacias duplicadas).

---

## Cuando usar

- Tras crear o reescribir `.sql` desde el agente.
- Antes de cerrar un requerimiento con scripts SQL.
- Si un `.sql` muestra el doble de lineas o una linea en blanco entre cada sentencia.

---

## Prohibido

No convertir fin de linea con `Replace("`n","`r`n")` sobre archivos que ya tienen CRLF: duplica a `\r\r\n`.

---

## Flujo

1. Identificar archivos `.sql` tocados.
2. Ejecutar el script del repo (rutas absolutas o relativas al cwd):

```powershell
& ".\.cursor\scripts\Normalize-SqlEncoding.ps1" `
  "Sales\promociones\20260514_TKT14821_pre_prcSetPromotionCommissionPromoCodesSync.sql"
```

3. Verificar salida `OK <ruta>` por archivo.
4. Si falla BOM o CRLF duplicado, corregir y repetir.

---

## Verificacion rapida

```powershell
python -c "p=r'Sales\\ruta\\script.sql'; b=open(p,'rb').read(); print('bom',b[:3]==b'\xef\xbb\xbf'); print('double',b.count(b'\r\r\n'))"
```

`bom True` y `double 0`.
