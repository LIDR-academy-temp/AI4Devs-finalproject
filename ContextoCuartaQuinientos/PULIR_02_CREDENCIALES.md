# Pulir Entrega 2 — Credenciales (sin secretos en git)

## Regla del curso / README

- **Repositorio:** solo plantillas (`*.example`, `scaffolds/`).
- **TA:** contraseñas reales en **Typeform** (campo de credenciales de prueba), no en GitHub.
- **Local:** archivo ignorado `test.txt` en la raíz (copia personal).

## Qué hacer tú

1. **Mantén** tus usuarios reales en `test.txt` **solo en tu PC** (ya está en `.gitignore`).
2. **No vuelvas a hacer** `git add test.txt`.
3. **Typeform Entrega 2:** pega el contenido de tu `test.txt` local en el campo que pide credenciales (o lista correo + perfil + contraseña de prueba).
4. **Fork/plantilla AI4Devs:** si piden README, enlaza a `scaffolds/CREDENCIALES_PRUEBA.example.txt` y a `README.md` §0 (Typeform).

## Si `test.txt` estuvo en git antes

Ejecutar una vez (deja el archivo local, lo quita del repo):

```powershell
git rm --cached test.txt
git add .gitignore scaffolds/CREDENCIALES_PRUEBA.example.txt
git commit -m "chore: sacar test.txt del repo; plantilla de credenciales de prueba"
```

Si ya se hizo push con contraseñas, **rota** contraseñas en BD de prueba/prod y actualiza solo Typeform + tu `test.txt` local.

## Conexión API/BD (distinto de login web)

Secretos de servidor: `appsettings.Production.json`, `.publishSettings`, `.env` — ya gitignored. Ver `scaffolds/api/*.example.json` y `Web/.env.example`.
