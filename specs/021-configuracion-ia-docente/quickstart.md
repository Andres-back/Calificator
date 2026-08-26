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