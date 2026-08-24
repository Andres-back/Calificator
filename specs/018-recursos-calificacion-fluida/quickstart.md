# Quickstart de validación: Recursos y calificación fluida

## Prerrequisitos

- Docker Desktop activo.
- Rama codex/018-recursos-calificacion-fluida.
- Variables locales sin credenciales versionadas.
- Profesor y estudiante de prueba en una materia controlada.
- Fixtures sanitizados de foto legible, foto ambigua, PDF multihoja y evaluación online.

## Arranque

    docker compose up -d
    docker compose ps

Resultado esperado: backend, worker, Redis y PostgreSQL saludables; frontend accesible localmente.

## Validación 1 - Ciclo de recurso

1. Iniciar sesión como profesor.
2. Generar un recurso seleccionando una materia.
3. Confirmar que el detalle ofrece borrador, apoyo y actividad.
4. Elegir apoyo y hacerlo visible.
5. Comprobar que el mismo id aparece en Recursos y en la materia.
6. Como estudiante matriculado, abrirlo y descargarlo.
7. Ocultarlo y confirmar que deja de estar accesible sin borrarse.
8. Convertir un recurso respondible en actividad.
9. Publicar, pausar, reabrir y cerrar recepción desde sus controles.
10. Confirmar estados iguales en Recurso, Materia y Evaluaciones.
11. Repetir conversión y confirmar que no se crea otra evaluación.

Criterios: SC-001, SC-002 y SC-003.

## Validación 2 - Seguridad por rol

- Estudiante no puede llamar asignar, visibilidad, conversión ni recepción.
- Profesor ajeno no puede modificar el recurso ni evaluación.
- Estudiante no matriculado no puede listar ni abrir.
- Recurso oculto y actividad vinculada oculta devuelven acceso denegado.
- Profesor propietario conserva acceso aunque esté oculto.

## Validación 3 - Presupuesto de calificación

Usar dobles de proveedor controlados:

1. extracción 2 s, principal 3 s, secundario 4 s: éxito con dos valoraciones;
2. extracción 2 s, principal 3 s y verificador lento: el job permanece `running` y termina cuando llega la respuesta;
3. primer candidato 5xx y segundo éxito: un intento por candidato y fallback visible;
4. ambos fallan: evidencia guardada, estado de revisión/error y sin nota publicada;
5. respuesta posterior a 180 s: completa y persiste la nota una sola vez;
6. reintento del job: una entrega y una calificación vigente.
7. consenso normal: extracción `qwen3.7-plus`, evaluación Flash, verificación Flash y ninguna llamada Pro;
8. discrepancia o confianza baja: una sola llamada Pro de arbitraje y trazabilidad `arbiter_invoked=true`.

Comprobar timings_ms, pipeline_run_id y un evento por intento externo. Ningún evento contiene prompt, respuesta o evidencia.

Criterios: SC-004 a SC-008.

## Validación 4 - Digitalización

1. Foto con diez preguntas y clave determinística completa.
2. Confirmar una sola extracción visual y estructuración textual.
3. Verificar que no se llama key_repair cuando la clave queda completa.
4. Fixture con dos respuestas abiertas faltantes: reparación solo de esos números.
5. Simular estructuración lenta: el job conserva la solicitud; simular desconexión real: fallback/reintento recuperable.
6. Confirmar una sola evaluación borrador y preguntas editables.

Medición real opcional fuera de CI: muestra controlada contra proveedores configurados, sin registrar contenido.

## Validación 5 - Ajuste contextual

1. Abrir una calificación con al menos veinte componentes.
2. Elegir el componente 10.
3. Confirmar que el editor aparece dentro de su tarjeta.
4. Cambiar puntos y explicación; verificar previsualización de fórmula.
5. Guardar y comprobar versión, historial y posición.
6. Crear conflicto 409 y confirmar recarga sin sobrescritura.
7. Modificar sin guardar e intentar cambiar componente: aparecen guardar, descartar y permanecer.

Criterios: SC-009 y SC-010.

## Validación 6 - Scroll y responsividad

Ejecutar Chromium y WebKit en:
- 360×800;
- 390×844;
- 768×1024;
- 1366×768;
- 1920×1080;
- claro y oscuro.

En cada caso:
1. alcanzar último estudiante;
2. abrir detalle;
3. alcanzar evidencia, último componente, retroalimentación, incidencias e historial;
4. abrir editor y teclado móvil;
5. guardar/cancelar;
6. volver y verificar filtros/posición;
7. navegar a otra ruta y confirmar document.body desbloqueado;
8. verificar ausencia de overflow horizontal y objetivos táctiles.

Criterios: SC-011 y SC-012.

## Comandos de pruebas

Backend dirigido:

    docker compose exec backend pytest backend/tests/unit backend/tests/integration -q

Frontend:

    cd frontend
    npm run lint
    npm run typecheck
    npm run test:run
    npm run build
    npm run test:e2e
    npm run test:a11y
    npm run test:visual

Validación completa del repositorio según CI:

    npm run check

## Regresión de calificación

Para cada fixture aprobado comparar antes/después:
- componentes detectados;
- correcta/parcial/incorrecta;
- puntos por componente;
- nota final;
- cobertura y requiere_revision;
- evidencia de página.

Aceptación: misma decisión por componente y diferencia de nota máxima 0,1, o una revisión explícita más segura. Nunca publicación automática ante pérdida de cobertura.

## Producción segura posterior al merge

- Confirmar health y versión.
- Verificar una navegación de lectura por rol.
- Consultar métricas agregadas de cola/etapas sin contenido.
- Procesar solo fixture autorizado.
- Medir p50/p90 por etapa; si una ejecución supera el objetivo, confirmar que permanece activa y finalmente persiste el resultado.
- Si calidad o latencia regresa, revertir el commit reproduciblemente.
## Validación 7 - Rúbrica generada editable

1. Crear o editar una evaluación con rúbrica generada por IA.
2. Modificar nombre, descripción, peso y un descriptor de nivel.
3. Agregar, reordenar y eliminar un criterio.
4. Dejar el total distinto de 100 % y confirmar que no se puede continuar.
5. Usar “Distribuir pesos” o ajustar manualmente hasta 100 %.
6. Confirmar y comprobar que el PATCH conserva el contenido editado y recalcula puntaje_maximo según la nota máxima.
7. Repetir en escritorio y 390×844 verificando que todos los controles sean visibles y utilizables.

Criterios: FR-032, FR-036 y SC-016.
