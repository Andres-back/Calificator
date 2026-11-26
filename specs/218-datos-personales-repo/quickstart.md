# Validación: Datos personales fuera del repositorio público y licencia MIT

**Spec**: [spec.md](spec.md) | **Issue**: [#458](https://github.com/Andres-back/Calificator/issues/458)

## Cómo comprobarlo

```bash
git grep -n -I -i -E "@gmail\.com|@hotmail" -- .          # solo el contacto legal del proyecto
git grep -n -I -w -E "<nombres de las docentes del piloto>" -- . ':!frontend/public/vendor'   # sin resultados
cd encuesta-docente
python -m unittest discover -s tests
node --test tests/submission.test.mjs
```

## Resultado del 2026-11-26

- La búsqueda de correos personales devuelve solo `toolscoldev@gmail.com`, el contacto legal del proyecto. El teléfono y los nombres de las docentes del piloto no aparecen.
- Antes de quitar `Teléfono: …` de `app.py`, las 74 pruebas de la encuesta fallaban por la clave `contact_phone` ausente; después, 74 de 74 en verde y la prueba de envío en Node en verde.
- `LICENSE` con la licencia MIT y sección «Licencia» en `README.md`.

## Límites

- El historial de Git conserva los datos anteriores; reescribirlo quedó fuera por decisión del usuario.
