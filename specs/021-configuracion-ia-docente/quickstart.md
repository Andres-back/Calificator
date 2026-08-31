# Validación rápida: configuración de IA global y por docente

## Preparación

1. Aplicar migraciones en una base con configuración global y `profesor_ai_configs` heredada.
2. Usar cuentas de administrador, dos docentes y un estudiante.
3. Configurar claves sintéticas/mocks; ninguna prueba debe imprimir secretos.

## Escenario A: configuración global por capacidad

1. Entrar como administrador y abrir `/app/admin/configuracion-ia`.
2. Seleccionar modelos diferentes para generación de contenido y visión.
3. Intentar asignar un modelo textual a visión: debe rechazarse antes de publicar.
4. Probar cada ruta y publicar con la versión visible.
5. Confirmar que backend y worker muestran el mismo hash.

## Escenario B: docente en modo automático

1. Entrar como docente y abrir `/app/configuracion-ia`.
2. Elegir “Usar mi proveedor”, guardar una credencial autorizada y probarla.
3. Mantener modo automático y crear un recurso.
4. Consultar el job: debe registrar proveedor/modelo/origen docente sin clave.
5. Entrar con el segundo docente: debe seguir usando configuración institucional.

## Escenario C: modo avanzado y compatibilidad

1. Activar modo avanzado para el primer docente.
2. Elegir un modelo de visión para digitalización y uno textual para presentaciones.
3. Confirmar que los selectores filtran modelos incompatibles.
4. Digitalizar una evaluación y generar una presentación; cada trabajo debe conservar su propia instantánea.

## Escenario D: fallback consentido

1. Autorizar fallback institucional y simular un fallo temporal de la clave docente.
2. Comprobar que el trabajo usa la ruta global y registra el fallback.
3. Desactivar el consentimiento, repetir y comprobar estado reintentable sin consumo institucional.

## Escenario E: trabajo inmutable

1. Crear un trabajo y dejarlo en cola.
2. Cambiar el modelo global y reemplazar la clave personal.
3. Iniciar el worker y comprobar que conserva proveedor/modelo/versión capturados; si la credencial anterior ya no existe, aplica la política capturada.

## Escenario F: seguridad y roles

1. Confirmar que estudiante recibe 403 en todos los endpoints de configuración.
2. Confirmar que un docente no puede consultar ni modificar credenciales de otro.
3. Buscar el valor de la clave sintética en respuestas, logs, base de jobs, auditoría y artefactos: debe haber cero coincidencias.

## Escenario G: móvil y reversión

1. Completar el modo automático a 360×800 en claro y oscuro sin scroll horizontal.
2. Restaurar modo institucional y verificar que nuevos trabajos usan la ruta global.
3. Desactivar el rollout de calificación y comprobar que el flujo estable anterior continúa operativo.

## Escenario H: Ollama Cloud institucional

1. Elegir Ollama Cloud en administración y guardar una credencial nueva.
2. Probarla, actualizar modelos y verificar capacidades con un modelo de visión y otro de texto.
3. Ejecutar un trabajo y comprobar origen institutional_cloud, modelo y versión sin clave.

## Escenario I: Ollama Cloud personal

1. Habilitar credenciales docentes para Ollama.
2. Guardar una credencial Cloud desde un docente y probarla.
3. Seleccionar un modelo personal y confirmar aislamiento frente a otro docente.
4. Forzar un fallo y validar el fallback según consentimiento.

## Escenario J: conector local Windows

1. Instalar el conector en Windows con Ollama activo.
2. Generar un código, emparejar y actualizar los modelos locales.
3. Entrar en modo avanzado y seleccionar un modelo local únicamente para Presentaciones.
4. Cerrar el navegador y comprobar que el trabajo se completa y reanuda una sola vez.
5. Desconectar durante otro trabajo, reconectar y verificar recuperación por lease.
6. Revocar el último conector y confirmar que deja de reclamar trabajos y que la presentación suspendida pasa al fallback autorizado o a un error visible.
7. Confirmar que calificación, visión, digitalización y entregas no ofrecen Ollama local ni envían evidencia al conector.

> Alcance seguro actual: Ollama Cloud continúa disponible según capacidades para
> las funciones configuradas. Ollama local solo procesa prompts de Presentaciones;
> su integración con evidencia estudiantil permanece bloqueada hasta implementar
> persistencia y consentimiento explícito por trabajo.

## Comandos de validación

```powershell
docker compose run --rm backend-test pytest -q
cd frontend
npm run lint:strict
npm run typecheck
npm run test:run
npm run build
npm run test:mock
```

## Resultado de validación final — 2026-08-26

- Docker: construcción correcta de `backend`, `migrate`, `worker` y `beat`.
- Alembic: ciclo real `202608240001 → 202608250004 → 202608240001 → 202608250004` correcto en una base PostgreSQL temporal; la base local quedó en `202608250004 (head)`.
- Backend: `522 passed, 1 skipped`; compilación completa de `app` y `tests` correcta.
- Seguridad: pruebas de cifrado, aislamiento y sanitización correctas; cero patrones de credenciales en fuentes fuera del caso sintético controlado.
- Frontend: lint estricto y TypeScript correctos; `56` archivos y `212` pruebas Vitest aprobados; build de producción correcto.
- Acciones: `312` botones y `80` enlaces auditados con propósito verificable.
- E2E: panel docente `2/2`, backend simulado `1/1` y accesibilidad `3/3`, incluido viewport `360×800`.
- Inventario: vigente con `407` superficies y propiedad asignada.
- Convergencia: T045–T047 satisfechas; no quedaron tareas funcionales pendientes.

Advertencias no bloqueantes observadas: una cancelación asíncrona emitida por una prueba de fallo de visión, una API de Pillow marcada para deprecación futura y un chunk principal de frontend superior a 500 kB. No afectan los criterios de aceptación de esta funcionalidad.

## Validación incremental — 2026-08-31

- Backend focalizado de configuración y presentaciones: `43 passed`; conector y cliente Windows: `16 passed`.
- Frontend de administración y preferencias: `20 passed`; TypeScript, ESLint y build de producción correctos.
- Ruff focalizado y `git diff --check`: sin errores funcionales.
- Reanudación cubierta para callback correcto, callback duplicado, error, expiración y revocación del último conector.
- Inventario técnico regenerado con `485` superficies y convergencia T067 completada; el script rechaza presentar como distribuible un ejecutable sin firma.

## Validación de privacidad y empaquetado — 2026-08-31

- Ollama local queda disponible solo para Presentaciones; `calificacion_texto`, `calificacion_foto`, `evaluacion_digitalizar` y `vision_ocr` se rechazan antes de consultar un modelo local.
- Regresión Ollama, credenciales y resolvedor: `33 passed` sin claves reales.
- El script rechaza una distribución sin `CertificateThumbprint` y exige `-AllowUnsignedDevelopment` para una compilación local no distribuible.
- PyInstaller `6.15.0` produjo un ejecutable Windows de desarrollo de `8.916.778` bytes; `--help` funcionó, Authenticode reportó `NotSigned` como se esperaba y el SHA-256 tuvo 64 caracteres.
- Los artefactos temporales `build`, `dist` y `.spec` se eliminaron después de validar y quedaron excluidos de Git.

## Aceptación local Windows 11 — 2026-08-31

- El equipo real ejecutó Windows 11 Pro `10.0.26200` y Ollama en un puerto loopback alternativo (`11435`).
- El conector ahora acepta un puerto local configurable, conserva `11434` por defecto y rechaza HTTPS, credenciales embebidas, nombres de red y direcciones que no sean `127.0.0.1`, `localhost` o `::1`.
- Descubrimiento real: dos modelos detectados en `0,09 s`; `qwen3.5:9b` identificó capacidades de texto y visión.
- Inferencia de presentación sin información estudiantil: respuesta válida de 395 caracteres en `5,4 s`.
- Regresión focalizada: `17 passed`; Ruff sin hallazgos.
- Ejecutable de desarrollo reconstruido: `8.916.774` bytes, ayuda y opción `--ollama-url` operativas, SHA-256 de 64 caracteres y estado `NotSigned` esperado. Los artefactos temporales volvieron a eliminarse.
- E2E local completo: emparejamiento, publicación de dos modelos, suspensión/reanudación del worker y presentación de tres diapositivas en estado `success` en `29,43 s`.
- La prueba restauró la configuración del docente, eliminó la presentación temporal y revocó el conector; la comprobación posterior reportó cero presentaciones temporales y cero conectores de prueba activos.
- T068 permanece parcial únicamente hasta repetir la matriz en Windows 10 22H2.
