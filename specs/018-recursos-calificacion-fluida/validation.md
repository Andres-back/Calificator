# Validación: Recursos y calificación fluida

## Línea base productiva (lectura agregada, 2026-08-22)

- Cola reciente: 0–3 s; no era el cuello de botella.
- Calificación activa observada: 95–578 s.
- Digitalización activa observada: 91–249 s.
- Qwen 3.7 Plus exitoso: promedio aproximado de 69 s.
- MiMo 2.5 exitoso: promedio aproximado de 17 s.
- Qwen 3.6 Plus acumulaba fallos de hasta 408 s al repetir el mismo candidato.
- El flujo anterior hacía una extracción visual y dos calificaciones visuales completas.

La consulta fue agregada y no incluyó evidencia, prompts, respuestas ni datos personales.

## Cambio aplicado

- Un intento acotado por candidato dentro del pipeline de calificación y digitalización.
- Una sola extracción visual con `qwen3.7-plus` como principal; un evaluador Flash genera el desglose y un verificador Flash compacto valida puntajes y fórmula sobre la transcripción normalizada.
- El evaluador principal conserva una salida máxima de 3.072 tokens y el verificador 1.536. Los segundos configurados son umbrales observacionales; conexión/escritura/pool están protegidos y la lectura de una inferencia aceptada no se cancela.
- Si un evaluador no termina, la valoración disponible queda para revisión docente; no se publica automáticamente.
- `deepseek-v4-pro` dejó de ejecutarse en todos los trabajos: tiene un único intento de hasta 30 s solo ante discrepancia, baja confianza, ambigüedad o fallo del verificador.
- Cada llamada multimodal produce un único evento `vision`, sin el duplicado `text` anterior.
- La estructuración posterior al OCR usa por defecto `deepseek-v4-flash` con 60 s; visión permanece en MiMo/Qwen.

## Verificaciones ejecutadas

- Backend completo: 478 pruebas aprobadas, 1 omitida.
- Frontend: 197 pruebas en 54 archivos, lint, TypeScript y build de producción aprobados.
- TypeScript: aprobado.
- ESLint: aprobado.
- Build Vite de producción: aprobado.
- Docker Compose: configuración válida y backend/worker/PostgreSQL/Redis saludables.
- Regresiones dirigidas cubren un intento, evento visual único, lectura persistente y respuesta posterior al antiguo deadline.

## Pendiente de medición controlada

La latencia real posterior debe medirse con un fixture autorizado después del despliegue. Se reportarán p50/p90 por etapa; exceder el objetivo no cancela la solicitud. La calidad debe conservar la misma decisión por componente y una diferencia máxima de 0,1, o terminar explícitamente en revisión por un fallo real.

## Validación final local (2026-08-22)

- Backend completo local: 478 pruebas aprobadas y 1 omitida; la imagen de producción excluye dependencias de prueba y superó healthcheck.
- Backend dirigido de telemetría, autorización, digitalización y desglose: 67 pruebas aprobadas.
- Frontend unitario: 195 pruebas aprobadas en 53 archivos.
- TypeScript, ESLint y build Vite de producción: aprobados.
- Playwright Chromium: 13 recorridos aprobados de recursos y calificación, incluidos 360, 390, 768 y 1366 px.
- Playwright WebKit: 7 recorridos de calificación aprobados, incluida edición y recuperación de scroll en la respuesta 20.
- Accesibilidad móvil: controles con nombre, foco alcanzable, mínimo táctil de 44 px y ausencia de desbordamiento horizontal.
- Regresión visual: líneas base claro y oscuro aprobadas a 390×844.
- La auditoría de accesibilidad detectó y corrigió el tamaño de Volver a lista, Cerrar detalle y Nueva incidencia.
- Imagen de producción reconstruida; backend y worker saludables, Docker Compose válido, OpenAPI alineado y escaneo de secretos limpio.
- Convergencia: se detectó y cerró el cambio silencioso de materia; backend devuelve 409 y la UI conserva la materia original.

## Refinamiento de camino rápido (2026-08-22)

- Política normal: Qwen 3.7 Plus extrae una vez, DeepSeek V4 Flash califica y otro pase Flash compacto verifica.
- Política excepcional: DeepSeek V4 Pro arbitra una sola vez y la causa queda en `strategy.arbiter_reason`.
- Causas normalizadas: `score_discrepancy`, `low_confidence`, `verifier_requested`, `verifier_failure`, `primary_requested` y `primary_failure`.
- La vista docente muestra por separado lectura, evaluación, verificación y arbitraje; ya no presenta al verificador como un segundo Pro obligatorio.
- Pruebas dirigidas del camino rápido y árbitro: 25 aprobadas.
- Backend completo final: 482 pruebas aprobadas y 1 omitida.
- Frontend completo: auditoría de 301 botones y 80 enlaces, ESLint, TypeScript, 195 pruebas y build Vite aprobados.
- Las imágenes de backend y worker se reconstruyeron y ambos contenedores alcanzaron estado saludable. La imagen de producción excluye `pytest`, por lo que la suite se ejecutó con el entorno local de desarrollo.
- Medición real pendiente: ejecutar un fixture autorizado tras desplegar y comparar `extraction`, `primary`, `secondary` y `consolidation`. Objetivo operativo: que el camino sin arbitraje no espere al modelo Pro y que el p90 sea inferior a 90 s.
- Respuesta tardía preservada: no hay `asyncio.timeout`/`wait_for` en calificación o digitalización; OpenCode usa `read=None`, transporte finito y jobs idempotentes.

## Cierre técnico final (2026-08-24)

- Backend completo: 484 pruebas aprobadas, 1 omitida y 0 fallos.
- Frontend completo: auditoría de 301 botones y 80 enlaces; ESLint, TypeScript, 197 pruebas en 54 archivos y build Vite aprobados.
- Playwright Chromium funcional: 39 de 39 recorridos aprobados entre 360×800 y 1920×1080, para profesor, estudiante y administración, incluido modo oscuro.
- Accesibilidad: 2 de 2 recorridos aprobados. Regresión visual: 3 de 3 comparaciones aprobadas en claro y oscuro.
- WebKit: 38 de 39 recorridos aprobaron en la corrida continua; el único `Network Error` no reproducible aprobó al repetirse aisladamente. La espera de red eliminó el fallo sistemático por consultas abortadas entre rutas.
- Docker reconstruido: backend y worker saludables, Celery responde, migraciones concluyen y el esquema OpenAPI 3.1 genera 165 rutas y 165 esquemas; el endpoint público permanece desactivado en producción.
- Configuración efectiva: `qwen3.7-plus` para visión, `deepseek-v4-flash` para calificación/verificación y `deepseek-v4-pro` solo para arbitraje; lectura sin timeout y conexión/escritura/pool en 15/60/30 s.
- Gobernanza: 39 pruebas aprobadas, inventario vigente de 388 superficies, diff sin errores y escaneo de secretos limpio en 82 archivos.


## Regresión de vistas internas de materia (2026-08-24)

- Causa reproducida: los campos DBA leían `event.currentTarget.value` dentro de un actualizador diferido de React; el evento podía quedar anulado y derribar la ruta al escribir.
- Corrección: cada campo captura su valor antes de llamar a `setForm`; el mismo patrón inseguro se eliminó del crucigrama del estudiante.
- Prevención: `audit:actions` falla si detecta lectura de `event.target/currentTarget` dentro de un actualizador funcional de estado.
- Navegación de materia: Vista general, Evaluaciones, Recursos, Calificar, Asistencia, Boletín y DBA aprobadas a 390×844, sin errores de JavaScript ni desbordamiento horizontal.
- Chromium: escritura, envío y cierre del formulario DBA aprobados con clic real. WebKit: escritura y manejador de envío aprobados.
- Frontend completo: auditoría de 301 botones y 80 enlaces; ESLint, TypeScript, 197 pruebas en 54 archivos y build de producción aprobados.
- Suite responsive completa Chromium: 21 de 21 recorridos aprobados entre 360×800 y 1920×1080, incluidos los tres roles y modo oscuro.

## Corrección de rueda en el detalle de calificaciones (2026-08-24)

- Reproducción automatizada previa: al usar la rueda sobre el panel derecho en 1366×768, el scroll principal permanecía en 542 px.
- Causa: el detalle conservaba `overscroll-contain` en escritorio aunque su altura no formaba un scroller independiente, bloqueando el encadenamiento hacia el contenedor principal.
- Corrección: `overscroll-contain` se mantiene en móvil y cambia a `overscroll-auto` desde `lg`, sin alterar el overlay ni el bloqueo del cuerpo en dispositivos pequeños.
- Playwright: 8/8 recorridos de calificación aprobados en Chromium y 8/8 en WebKit; incluye rueda en escritorio, respuesta 20 en móvil, reclamo estudiantil y conflicto 409.
- Frontend completo: auditoría de 301 botones y 80 enlaces; ESLint, TypeScript, 197 pruebas en 54 archivos y build de producción aprobados.
