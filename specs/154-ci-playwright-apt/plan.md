# Plan: Un mirror lento de Ubuntu no agota la CI de frontend

**Spec**: [spec.md](spec.md) | **Issue**: [#325](https://github.com/Andres-back/Calificator/issues/325)

## Diagnóstico

Registros de GitHub Actions del 2026-11-06:

| Ejecución | Trabajo | Descarga de `apt` | Resultado |
| --- | --- | --- | --- |
| 42179890815, intento 1 | contextual | más de 34 min sin terminar | cancelado a los 35 min |
| 42179890815, intento 2 | contextual | más de 34 min sin terminar | cancelado a los 35 min |
| 42256260442, intento 1 | shard 4/4 | 82.9 MB en 36 min 42 s (37.6 kB/s) | cancelado a los 40 min, con las pruebas recién empezadas |
| 42256260442, intento 1 | shard 1/4 | 89.5 MB en 7 s (12.3 MB/s) | correcto |

No es un cuelgue: `apt` avanza muy lento contra `azure.archive.ubuntu.com`. Los navegadores se descargan en segundos, y su descarga no es la causa. Un trabajo sano completa el paso en menos de 2 minutos.

## Decisión

- `actions/cache` guarda y restaura `/var/cache/apt/archives/*.deb`. `apt-get` reutiliza un archivo solo si coincide con la versión y el hash esperados.
- El directorio pasa a ser del usuario del runner para que la caché pueda restaurar ahí. Su subdirectorio `partial` no cambia.
- La clave usa el hash de `frontend/package-lock.json`, con `restore-keys` para aprovechar la caché anterior.
- El paso de instalación tiene `timeout-minutes: 5`. Con los 35 minutos de pruebas de los shards, ocupa exactamente los 40 del trabajo.

Descartado:

- Reintentar con `timeout` alrededor del comando: podría matar `dpkg` durante la instalación y dejar el sistema inconsistente. Además, los 40 minutos no alcanzan para esperar varios intentos.
- Imagen Docker de Playwright: resuelve lo mismo, pero cambia el entorno de todos los trabajos E2E y obliga a mantener su versión alineada.
- Cambiar de mirror: solo traslada el riesgo.
- Cachear `~/.cache/ms-playwright`: los navegadores no son la causa.
- Subir los límites de los trabajos: ocultaría el problema.

## Alcance técnico

| Archivo | Cambio |
| --- | --- |
| `.github/workflows/ci.yml` | caché de paquetes y límite de tiempo en los dos trabajos |
| `tests/spec_governance/test_playwright_install_ci.py` | prueba de gobernanza |

Sin cambios en la aplicación, en las pruebas E2E ni en producción.

## Riesgos

- `actions/cache` guarda solo cuando el trabajo termina bien. Una caché nueva aparece después de la primera ejecución correcta.
- Sin caché y con el mirror lento, el trabajo falla a los 5 minutos y hay que relanzarlo.
- El cambio solo se puede validar en GitHub Actions. La validación necesita dos ejecuciones: una que cree la caché y otra que la use.
